import { useState, memo } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RulesCardProps {
    rules: string[];
    onRulesChange: (rules: string[]) => void;
}

export default memo(function RulesCard({ rules, onRulesChange }: RulesCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const addRule = () => {
        onRulesChange([...rules, '']);
    };

    const updateRule = (index: number, value: string) => {
        const newRules = [...rules];
        newRules[index] = value;
        onRulesChange(newRules);
    };

    const removeRule = (index: number) => {
        const newRules = rules.filter((_, i) => i !== index);
        onRulesChange(newRules);
    };

    return (
        <Card className="bg-white shadow-md border-0">
            <CardHeader
                onClick={toggleExpanded}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
                <div className="flex items-center justify-between">
                    <CardTitle>Quy định sân</CardTitle>
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                    />
                </div>
            </CardHeader>
            {isExpanded && (
                <>
                    <hr className="border-t border-gray-300 my-0 mx-6" />
                    <CardContent className="pt-6 space-y-4">
                        {rules.map((rule, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    placeholder="Nhập quy định"
                                    value={rule}
                                    onChange={(e) => updateRule(index, e.target.value)}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRule(index)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary hover:bg-primary/10"
                            onClick={addRule}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Thêm quy định
                        </Button>
                    </CardContent>
                </>
            )}
        </Card>
    );
});
