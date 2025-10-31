import { useContactCenter } from '../contextproviders/ContactCenterContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, MessageSquare, HelpCircle, CheckSquare, AlertCircle, Lightbulb, TrendingUp, BookOpen, DollarSign, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CallScript() {
  const { scriptData } = useContactCenter();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (Array.isArray(scriptData) && scriptData.length > 0) {
      const startSlideIndex = scriptData.findIndex(slide => slide?.startSlide);
      setCurrentSlideIndex(startSlideIndex >= 0 ? startSlideIndex : 0);
    }
  }, [scriptData]);

  if (!scriptData || !Array.isArray(scriptData) || scriptData.length === 0) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No script loaded</p>
        </div>
      </div>
    );
  }

  const currentSlide = scriptData[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === scriptData.length - 1;

  const handlePrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (!isLastSlide) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const renderContent = (content, index) => {
    switch (content.type) {
      case 'script':
        return (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-base leading-relaxed">{content.content}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'question':
        return (
          <Card key={index} className="border-l-4 border-l-purple-500 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <HelpCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-base font-medium leading-relaxed">{content.content}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'checklist':
        return (
          <Card key={index} className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {content.label && (
                    <p className="font-medium mb-2">{content.label}</p>
                  )}
                  <ul className="space-y-2">
                    {content.items?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'note':
        return (
          <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm italic text-muted-foreground">{content.content}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'tip':
        return (
          <Card key={index} className="border-l-4 border-l-cyan-500 bg-cyan-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{content.content}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'statistics':
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Condition Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <Badge variant="outline" className="mb-2">{stat.condition}</Badge>
                  <p className="text-sm leading-relaxed">{stat.stat}</p>
                  <p className="text-xs text-muted-foreground">Source: {stat.source}</p>
                  {idx < content.items.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'stories':
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Case Studies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((story, idx) => (
                <div key={idx} className="space-y-2">
                  <Badge variant="secondary">{story.condition}</Badge>
                  <p className="text-sm leading-relaxed italic">{story.story}</p>
                  {idx < content.items.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'pricing':
        return (
          <Card key={index} className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Pricing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.options?.map((option, idx) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-lg">{option.plan}</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{option.price}</div>
                  {option.details && (
                    <div className="text-sm text-muted-foreground mt-2">{option.details}</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'objection':
        return (
          <Card key={index} className="border-l-4 border-l-orange-500 bg-orange-50/50">
            <CardContent className="pt-6 space-y-3">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">{content.question}</p>
                  <div className="pl-4 border-l-2 border-orange-300">
                    <p className="text-sm">{content.response}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'objections':
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Common Objections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.items?.map((obj, idx) => (
                <div key={idx} className="space-y-2 p-4 bg-orange-50/50 rounded-lg">
                  <Badge variant="outline" className="bg-white">{obj.category}</Badge>
                  <div>
                    <p className="font-medium text-sm mb-1">"{obj.objection}"</p>
                    <div className="pl-4 border-l-2 border-orange-300">
                      <p className="text-sm text-muted-foreground">{obj.response}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={index}>
            <CardContent className="pt-6">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Call Script</h2>
            {currentSlide?.title && (
              <p className="text-sm text-muted-foreground mt-1">{currentSlide.title}</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Slide {currentSlideIndex + 1} of {scriptData.length}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">

          {currentSlide?.slideContent && Array.isArray(currentSlide.slideContent) && currentSlide.slideContent.length > 0 ? (
            <div className="space-y-4">
              {currentSlide.slideContent.map((content, index) => renderContent(content, index))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No content in this slide</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-6 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstSlide}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {scriptData.map((slide, index) => (
              <button
                key={slide.slideId || index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlideIndex
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={isLastSlide}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}