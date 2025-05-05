
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface MarketingQuizProps {
  onComplete: (answers: Record<number, string>) => void;
  questions?: Question[];
}

const defaultQuestions: Question[] = [
  {
    id: 1,
    text: "How often do you visit this location?",
    options: ["First time", "Weekly", "Monthly", "Rarely"]
  },
  {
    id: 2,
    text: "How did you hear about us?",
    options: ["Social media", "Friend", "Advertisement", "Just passing by"]
  },
  {
    id: 3,
    text: "What's your primary reason for using our WiFi?",
    options: ["Work", "Social media", "Entertainment", "Browsing"]
  }
];

const MarketingQuiz: React.FC<MarketingQuizProps> = ({ 
  onComplete, 
  questions = defaultQuestions 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const handleNext = () => {
    if (!selectedOption) {
      toast.error("Please select an answer");
      return;
    }
    
    const question = questions[currentQuestion];
    setAnswers(prev => ({ ...prev, [question.id]: selectedOption }));
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
    } else {
      // Submit answers and complete
      const finalAnswers = { ...answers, [question.id]: selectedOption };
      onComplete(finalAnswers);
      toast.success("Thank you for completing the survey!");
    }
  };
  
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Quick Survey</CardTitle>
        <CardDescription className="text-center">
          Complete this quick survey to get free WiFi access
        </CardDescription>
        <div className="flex justify-center mt-2 space-x-1">
          {questions.map((_, index) => (
            <div 
              key={index} 
              className={`h-1.5 w-10 rounded-full ${
                index === currentQuestion ? 'bg-primary' : 
                index < currentQuestion ? 'bg-primary/40' : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-lg font-medium text-center mb-4">
          {question.text}
        </div>
        
        <RadioGroup 
          value={selectedOption || ""} 
          onValueChange={setSelectedOption}
          className="space-y-3"
        >
          {question.options.map((option, idx) => (
            <div key={idx} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/10 cursor-pointer">
              <RadioGroupItem value={option} id={`option-${idx}`} />
              <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">{option}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleNext}
        >
          {isLastQuestion ? "Complete Survey" : "Next Question"} 
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MarketingQuiz;
