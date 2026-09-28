import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const inserted: { table: string; row: unknown }[] = [];

const fromMock = vi.fn((table: string) => ({
  insert: (row: unknown) => {
    inserted.push({ table, row });
    return {
      select: () => ({
        single: () =>
          Promise.resolve({ data: { id: `${table}-1` }, error: null }),
      }),
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null }),
    };
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import QuizForm from './QuizForm';

beforeEach(() => {
  inserted.length = 0;
  fromMock.mockClear();
});

afterEach(() => {
  cleanup();
});

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <QuizForm siteId="site-1" canEdit />
    </QueryClientProvider>,
  );
}

test('la soumission crée un quiz avec au moins une question et ses options', async () => {
  renderForm();

  fireEvent.change(screen.getByLabelText(/titre du quiz/i), {
    target: { value: 'Quiz Bienvenue' },
  });
  fireEvent.change(screen.getByLabelText(/question/i), {
    target: { value: 'Quelle est la capitale du Sénégal ?' },
  });
  fireEvent.change(screen.getByLabelText(/option 1/i), {
    target: { value: 'Dakar' },
  });
  fireEvent.change(screen.getByLabelText(/option 2/i), {
    target: { value: 'Thiès' },
  });
  fireEvent.click(screen.getByLabelText(/réponse correcte 1/i));

  fireEvent.click(screen.getByRole('button', { name: /créer le quiz/i }));

  await waitFor(() => {
    expect(fromMock).toHaveBeenCalledWith('quizzes');
  });

  const quizInsert = inserted.find((i) => i.table === 'quizzes');
  expect(quizInsert).toBeDefined();
  expect(quizInsert?.row).toMatchObject({ site_id: 'site-1', title: 'Quiz Bienvenue' });

  await waitFor(() => {
    const q = inserted.find((i) => i.table === 'quiz_questions');
    expect(q).toBeDefined();
    expect(q?.row).toMatchObject({
      quiz_id: 'quizzes-1',
      question: 'Quelle est la capitale du Sénégal ?',
    });
  });

  const opts = inserted.find((i) => i.table === 'quiz_options');
  expect(opts).toBeDefined();
  const rows = opts?.row as Array<Record<string, unknown>>;
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    question_id: 'quiz_questions-1',
    option_text: 'Dakar',
    is_correct: true,
  });
  expect(rows[1]).toMatchObject({ option_text: 'Thiès', is_correct: false });
});

test('refuse la soumission sans question', async () => {
  renderForm();

  fireEvent.change(screen.getByLabelText(/titre du quiz/i), {
    target: { value: 'Quiz vide' },
  });
  fireEvent.change(screen.getByLabelText(/option 1/i), { target: { value: 'A' } });
  fireEvent.change(screen.getByLabelText(/option 2/i), { target: { value: 'B' } });

  fireEvent.click(screen.getByRole('button', { name: /créer le quiz/i }));

  await waitFor(() => {
    expect(
      inserted.some((i) => i.table === 'quiz_questions'),
    ).toBe(false);
  });
});
