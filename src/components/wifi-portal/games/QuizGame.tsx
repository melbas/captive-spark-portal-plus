
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface QuizGameProps {
  onComplete: (score: number) => void;
  onCancel: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

const QuizGame: React.FC<QuizGameProps> = ({ onComplete, onCancel }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [timer, setTimer] = useState<number>(20);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Initialize quiz questions
  useEffect(() => {
    // In a real app, these would come from an API or database
    const quizQuestions: QuizQuestion[] = [
      {
        question: "Quelle est la capitale du Sénégal?",
        options: ["Dakar", "Lagos", "Abidjan", "Accra"],
        correctAnswer: 0
      },
      {
        question: "Quel est le plus grand océan du monde?",
        options: ["Atlantique", "Indien", "Arctique", "Pacifique"],
        correctAnswer: 3
      },
      {
        question: "Qui a écrit 'Les Misérables'?",
        options: ["Albert Camus", "Victor Hugo", "Honoré de Balzac", "Gustave Flaubert"],
        correctAnswer: 1
      },
      {
        question: "Quelle planète est connue comme la planète rouge?",
        options: ["Vénus", "Jupiter", "Mars", "Saturne"],
        correctAnswer: 2
      },
      {
        question: "Quel animal est le symbole de la République française?",
        options: ["Le lion", "L'aigle", "Le coq", "Le taureau"],
        correctAnswer: 2
      }
    ];
    
    setQuestions(quizQuestions);
    setLoading(false);
  }, []);
  
  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (!loading && !gameOver && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTime => prevTime - 1);
      }, 1000);
    } else if (timer === 0 && !gameOver) {
      // Time's up for this question
      handleNextQuestion();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, loading, gameOver]);
  
  const handleOptionSelect = (optionIndex: number) => {
    if (selectedOption !== null || gameOver) return;
    
    setSelectedOption(optionIndex);
    
    // Check if answer is correct
    if (questions[currentQuestionIndex].correctAnswer === optionIndex) {
      setScore(prevScore => prevScore + 1);
      toast.success("Bonne réponse!");
    } else {
      toast.error("Mauvaise réponse!");
    }
    
    // Move to next question after a short delay
    setTimeout(handleNextQuestion, 1000);
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedOption(null);
      setTimer(20); // Reset timer for next question
    } else {
      // Quiz is complete
      setGameOver(true);
      const finalScore = Math.round((score / questions.length) * 100);
      setTimeout(() => {
        onComplete(finalScore);
      }, 1500);
    }
  };
  
  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setTimer(20);
    setGameOver(false);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="h-6 w-6 border-t-2 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium">
          Question: {currentQuestionIndex + 1}/{questions.length}
        </div>
        <div className="text-sm font-medium">
          Score: {score}/{questions.length}
        </div>
        <div className={`text-sm font-medium ${timer <= 5 ? 'text-red-500' : ''}`}>
          Temps: {timer}s
        </div>
      </div>
      
      <div className="text-lg font-medium mb-4">
        {questions[currentQuestionIndex].question}
      </div>
      
      <div className="space-y-2">
        {questions[currentQuestionIndex].options.map((option, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all hover:border-primary
              ${selectedOption === index && index === questions[currentQuestionIndex].correctAnswer 
                ? 'bg-green-100 dark:bg-green-900/30 border-green-500' 
                : selectedOption === index 
                ? 'bg-red-100 dark:bg-red-900/30 border-red-500' 
                : ''}`}
            onClick={() => handleOptionSelect(index)}
          >
            <CardContent className="p-4">
              {option}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={resetQuiz}>
          Recommencer
        </Button>
        
        <Button variant="outline" onClick={onCancel}>
          Quitter
        </Button>
      </div>
    </div>
  );
};

export default QuizGame;
