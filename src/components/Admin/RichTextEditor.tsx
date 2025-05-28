
import React, { useRef, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/utils/api';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Digite o conteúdo completo do artigo",
  label = "Conteúdo" 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Map<string, string>>(new Map());

  // Sincronizar valor inicial
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      let content = editorRef.current.innerHTML;
      
      // Replace blob URLs with server URLs for saving
      uploadedImages.forEach((serverUrl, blobUrl) => {
        content = content.replace(new RegExp(blobUrl, 'g'), serverUrl);
      });
      
      onChange(content);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Create blob URL for immediate preview
          const blobUrl = URL.createObjectURL(file);
          
          // Insert image with blob URL immediately for instant preview
          executeCommand('insertImage', blobUrl);
          
          console.log('Image inserted with blob URL for preview:', blobUrl);
          
          // Show loading toast
          toast({
            title: 'Enviando imagem...',
            description: 'Por favor, aguarde.',
          });

          // Upload to server in background
          const formData = new FormData();
          formData.append('image', file);

          const response = await fetch(`${apiClient.baseURL}/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            const serverUrl = `${apiClient.baseURL}${data.url}`;
            
            // Store mapping for replacement when saving
            setUploadedImages(prev => new Map(prev.set(blobUrl, serverUrl)));
            
            console.log('Image uploaded successfully. Blob:', blobUrl, 'Server:', serverUrl);
            
            toast({
              title: 'Imagem enviada com sucesso!',
              description: 'A imagem foi inserida no editor.',
            });
          } else {
            // If upload fails, remove the image from editor
            if (editorRef.current) {
              const images = editorRef.current.querySelectorAll(`img[src="${blobUrl}"]`);
              images.forEach(img => img.remove());
            }
            URL.revokeObjectURL(blobUrl);
            throw new Error('Falha no upload');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          toast({
            title: 'Erro no upload da imagem',
            description: 'Tente novamente.',
            variant: 'destructive',
          });
        }
      }
    };
    
    input.click();
  };

  const insertLink = () => {
    const url = prompt('Digite a URL do link:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach((_, blobUrl) => {
        if (blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrl);
        }
      });
    };
  }, [uploadedImages]);

  return (
    <div className="space-y-2">
      <Label htmlFor="content-editor">{label} *</Label>
      
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-t-md bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyLeft')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyCenter')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyRight')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          className="h-8 w-8 p-0"
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor */}
      <div 
        className={`border ${isFocused ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-300'} rounded-b-md overflow-hidden bg-white`}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="min-h-[300px] p-4 outline-none rich-text-editor"
          style={{
            lineHeight: '1.6',
            fontSize: '14px'
          }}
          data-placeholder={!value ? placeholder : ''}
        />
      </div>
      
      {!value && (
        <p className="text-sm text-gray-500 mt-1">
          Este campo é obrigatório
        </p>
      )}
      
      <style>{`
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        .rich-text-editor img {
          max-width: 100%;
          height: auto;
          margin: 8px 0;
          border-radius: 4px;
          position: relative;
        }
        
        .rich-text-editor img[src^="blob:"] {
          border: 2px solid #10b981;
          box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
        }
        
        .rich-text-editor ul, .rich-text-editor ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        
        .rich-text-editor p {
          margin: 8px 0;
        }
        
        .rich-text-editor a {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
