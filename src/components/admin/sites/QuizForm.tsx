/**
 * QuizForm — création d'un quiz pour un site : titre, description,
 * première question + options (la bonne réponse marquée par radio).
 *
 * Tables : `quizzes`, `quiz_questions`, `quiz_options` (schéma `archive`
 * depuis la migration 2026-09-28-004 ; accès via une vue `public.*` de
 * compatibilité recréée par 2026-09-28-005_restore_quiz_games_rewards.sql).
 * La colonne `site_id` (uuid → sites.id) est ajoutée par la même migration :
 * elle scrope chaque quiz à son site, comme `ad_videos.site_id`.
 *
 * Styles de requêtes react-query : même pattern que PlansTab / AdsCarousel.
 * Typage volontairement souple (types générés pas encore à jour).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface QuizFormProps {
  /** sites.id (uuid textuel en base). */
  siteId: string;
  /** Désactive le formulaire (viewer ou mutation en cours). */
  canEdit?: boolean;
  /** Appelé après création réussie (pour recharger la liste parente). */
  onCreated?: () => void;
}

const NB_OPTIONS = 2;

export default function QuizForm({ siteId, canEdit = true, onCreated }: QuizFormProps) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);

  const createQuiz = useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      question: string;
      options: string[];
      correctIndex: number;
    }) => {
      // 1. Quiz, scopé au site.
      const { data: quiz, error: quizErr } = await (supabase.from('quizzes') as unknown as {
        insert: (row: Record<string, unknown>) => {
          select: () => {
            single: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      }).insert({
        site_id: siteId,
        title: input.title,
        description: input.description || null,
        active: true,
      }).select().single();
      if (quizErr) throw new Error(quizErr.message);
      if (!quiz) throw new Error('Quiz non créé.');

      // 2. Première question.
      const { data: q, error: qErr } = await (supabase.from('quiz_questions') as unknown as {
        insert: (row: Record<string, unknown>) => {
          select: () => {
            single: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      }).insert({
        quiz_id: quiz.id,
        question: input.question,
        question_type: 'multiple_choice',
        required: true,
        order_num: 0,
      }).select().single();
      if (qErr) throw new Error(qErr.message);
      if (!q) throw new Error('Question non créée.');

      // 3. Options (exactement une bonne réponse).
      const options = input.options.map((text, i) => ({
        question_id: q.id,
        option_text: text,
        is_correct: i === input.correctIndex,
        order_num: i,
      }));
      const { error: oErr } = await (supabase.from('quiz_options') as unknown as {
        insert: (row: Record<string, unknown>[]) => PromiseLike<{ error: { message: string } | null }>;
      }).insert(options);
      if (oErr) throw new Error(oErr.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes', siteId] });
      toast.success('Quiz créé.');
      setQuestion('');
      setCorrectIndex(0);
      onCreated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit || createQuiz.isPending) return;
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim();
    if (!question.trim()) {
      toast.error('Ajoutez au moins une question.');
      return;
    }
    const options = Array.from({ length: NB_OPTIONS }, (_, i) =>
      String(fd.get(`option-${i}`) ?? '').trim(),
    );
    createQuiz.mutate({ title, description, question: question.trim(), options, correctIndex });
    e.currentTarget.reset();
    setQuestion('');
    setCorrectIndex(0);
  };

  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">Lecture seule — modification impossible.</p>;
  }

  return (
    <form id="quiz-form" onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="quiz-title">Titre du quiz</Label>
          <Input id="quiz-title" name="title" required disabled={createQuiz.isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quiz-description">Description</Label>
          <Input id="quiz-description" name="description" disabled={createQuiz.isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quiz-question">Question</Label>
        <Input
          id="quiz-question"
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={createQuiz.isPending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: NB_OPTIONS }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Label htmlFor={`quiz-option-${i}`}>Option {i + 1}</Label>
            <Input
              id={`quiz-option-${i}`}
              name={`option-${i}`}
              disabled={createQuiz.isPending}
            />
          </div>
        ))}
      </div>

      <RadioGroup
        value={String(correctIndex)}
        onValueChange={(v) => setCorrectIndex(Number(v))}
        className="flex gap-4"
      >
        {Array.from({ length: NB_OPTIONS }, (_, i) => (
          <Label key={i} htmlFor={`quiz-correct-${i}`} className="flex items-center gap-2 font-normal">
            <RadioGroupItem id={`quiz-correct-${i}`} value={String(i)} aria-label={`Réponse correcte ${i + 1}`} />
            Bonne réponse {i + 1}
          </Label>
        ))}
      </RadioGroup>

      <Button type="submit" disabled={createQuiz.isPending}>
        {createQuiz.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Créer le quiz
      </Button>
    </form>
  );
}
