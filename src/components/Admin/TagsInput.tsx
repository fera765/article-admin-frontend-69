
import React, { useState, KeyboardEvent, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

const TagsInput: React.FC<TagsInputProps> = ({ 
  value = [], 
  onChange, 
  label = "Tags",
  placeholder = "Digite uma tag e pressione Enter"
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      e.stopPropagation();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInputValue('');
    }
    // Removido o requestAnimationFrame que forçava o foco
  };

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
    // Removido o requestAnimationFrame que forçava o foco
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only add tag on blur if we're not clicking on a remove button
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('[data-tag-remove]')) {
      addTag();
    }
    // Permitir que o foco seja transferido normalmente
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                data-tag-remove
                onClick={(e) => {
                  e.preventDefault();
                  removeTag(index);
                }}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5 focus:outline-none"
                tabIndex={-1}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          {value.length} tag{value.length !== 1 ? 's' : ''} adicionada{value.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default TagsInput;
