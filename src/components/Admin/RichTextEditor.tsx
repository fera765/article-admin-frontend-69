
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
  AlignRight,
  Minus,
  RotateCcw
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
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);

  // Sincronizar valor inicial
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
      setupImageHandlers();
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const setupImageHandlers = () => {
    if (!editorRef.current) return;
    
    const images = editorRef.current.querySelectorAll('img');
    images.forEach(img => {
      // Remove handlers antigos
      img.removeEventListener('click', handleImageClick);
      img.removeEventListener('load', setupImageResize);
      
      // Adiciona novos handlers
      img.addEventListener('click', handleImageClick);
      img.addEventListener('load', setupImageResize);
      
      // Torna a imagem redimensionável
      img.style.cursor = 'pointer';
      img.setAttribute('data-resizable', 'true');
    });
  };

  const handleImageClick = (e: Event) => {
    const img = e.target as HTMLImageElement;
    setSelectedImage(img);
    
    // Remove seleção de outras imagens
    if (editorRef.current) {
      const allImages = editorRef.current.querySelectorAll('img');
      allImages.forEach(i => i.classList.remove('image-selected'));
    }
    
    // Adiciona classe de seleção
    img.classList.add('image-selected');
  };

  const setupImageResize = (e: Event) => {
    const img = e.target as HTMLImageElement;
    
    // Configura propriedades básicas
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '8px auto';
    img.style.borderRadius = '4px';
    img.style.transition = 'all 0.2s ease';
    
    // Adiciona atributos para redimensionamento
    img.setAttribute('draggable', 'false');
    img.setAttribute('contenteditable', 'false');
  };

  const insertImageAtCursor = (imageUrl: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      
      if (range) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '300px';
        img.style.height = 'auto';
        img.style.margin = '8px';
        img.style.borderRadius = '4px';
        img.style.display = 'inline-block';
        img.style.cursor = 'pointer';
        img.setAttribute('data-resizable', 'true');
        img.setAttribute('draggable', 'false');
        img.setAttribute('contenteditable', 'false');
        
        range.deleteContents();
        range.insertNode(img);
        
        // Adiciona handlers para a nova imagem
        img.addEventListener('click', handleImageClick);
        img.addEventListener('load', setupImageResize);
        
        range.setStartAfter(img);
        range.setEndAfter(img);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        console.log('Image inserted at cursor:', imageUrl);
      } else {
        editorRef.current.appendChild(document.createElement('br'));
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '300px';
        img.style.height = 'auto';
        img.style.margin = '8px';
        img.style.borderRadius = '4px';
        img.style.display = 'block';
        img.style.cursor = 'pointer';
        img.setAttribute('data-resizable', 'true');
        img.setAttribute('draggable', 'false');
        img.setAttribute('contenteditable', 'false');
        
        editorRef.current.appendChild(img);
        
        img.addEventListener('click', handleImageClick);
        img.addEventListener('load', setupImageResize);
        
        console.log('Image appended to editor:', imageUrl);
      }
      
      handleInput();
    }
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const blobUrl = URL.createObjectURL(file);
          
          console.log('Inserting image with blob URL:', blobUrl);
          insertImageAtCursor(blobUrl);
          
          toast({
            title: 'Enviando imagem...',
            description: 'Por favor, aguarde.',
          });

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
            const serverUrl = data.url;
            
            console.log('Upload successful, replacing blob URL with server URL:', serverUrl);
            
            if (editorRef.current) {
              const content = editorRef.current.innerHTML;
              const updatedContent = content.replace(blobUrl, serverUrl);
              editorRef.current.innerHTML = updatedContent;
              onChange(updatedContent);
              setupImageHandlers();
            }
            
            URL.revokeObjectURL(blobUrl);
            
            toast({
              title: 'Imagem enviada com sucesso!',
              description: 'A imagem foi inserida no editor.',
            });
          } else {
            if (editorRef.current) {
              const images = editorRef.current.querySelectorAll(`img[src="${blobUrl}"]`);
              images.forEach(img => img.remove());
              handleInput();
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

  const insertHorizontalRule = () => {
    executeCommand('insertHorizontalRule');
    handleInput();
  };

  const insertLineBreak = () => {
    executeCommand('insertHTML', '<br><br>');
    handleInput();
  };

  // Funções para controlar imagens selecionadas
  const resizeSelectedImage = (size: 'small' | 'medium' | 'large' | 'full') => {
    if (!selectedImage) return;
    
    const sizes = {
      small: '150px',
      medium: '300px', 
      large: '500px',
      full: '100%'
    };
    
    selectedImage.style.maxWidth = sizes[size];
    selectedImage.style.width = sizes[size];
    handleInput();
  };

  const alignSelectedImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImage) return;
    
    switch (alignment) {
      case 'left':
        selectedImage.style.float = 'left';
        selectedImage.style.margin = '8px 16px 8px 0';
        selectedImage.style.display = 'block';
        break;
      case 'right':
        selectedImage.style.float = 'right';
        selectedImage.style.margin = '8px 0 8px 16px';
        selectedImage.style.display = 'block';
        break;
      case 'center':
        selectedImage.style.float = 'none';
        selectedImage.style.margin = '8px auto';
        selectedImage.style.display = 'block';
        break;
    }
    
    handleInput();
  };

  const clearImageFloat = () => {
    if (!selectedImage) return;
    
    selectedImage.style.float = 'none';
    selectedImage.style.margin = '8px auto';
    selectedImage.style.display = 'block';
    handleInput();
  };

  // Detecta mudanças no editor para configurar handlers
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setupImageHandlers();
    });

    if (editorRef.current) {
      observer.observe(editorRef.current, {
        childList: true,
        subtree: true
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="content-editor">{label} *</Label>
      
      {/* Toolbar Principal */}
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

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertHorizontalRule}
          className="h-8 w-8 p-0"
          title="Inserir linha separadora"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLineBreak}
          className="h-8 w-8 p-0"
          title="Inserir quebra de linha"
        >
          ↵
        </Button>
      </div>

      {/* Toolbar de Imagem (aparece quando uma imagem é selecionada) */}
      {selectedImage && (
        <div className="flex flex-wrap gap-1 p-2 border border-blue-300 rounded bg-blue-50">
          <span className="text-sm text-blue-700 font-medium mr-2">Imagem selecionada:</span>
          
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resizeSelectedImage('small')}
              className="h-8 px-2 text-xs"
            >
              Pequena
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resizeSelectedImage('medium')}
              className="h-8 px-2 text-xs"
            >
              Média
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resizeSelectedImage('large')}
              className="h-8 px-2 text-xs"
            >
              Grande
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resizeSelectedImage('full')}
              className="h-8 px-2 text-xs"
            >
              Completa
            </Button>
          </div>

          <div className="w-px h-6 bg-blue-300 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => alignSelectedImage('left')}
            className="h-8 w-8 p-0"
            title="Flutuar à esquerda"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => alignSelectedImage('center')}
            className="h-8 w-8 p-0"
            title="Centralizar"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => alignSelectedImage('right')}
            className="h-8 w-8 p-0"
            title="Flutuar à direita"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearImageFloat}
            className="h-8 w-8 p-0"
            title="Limpar flutuação"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
      
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
          onClick={(e) => {
            // Remove seleção de imagem se clicar fora
            if (e.target === editorRef.current) {
              setSelectedImage(null);
              if (editorRef.current) {
                const allImages = editorRef.current.querySelectorAll('img');
                allImages.forEach(i => i.classList.remove('image-selected'));
              }
            }
          }}
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
          margin: 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .rich-text-editor img:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .rich-text-editor img.image-selected {
          border: 2px solid #3b82f6;
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
        }
        
        .rich-text-editor img[src^="blob:"] {
          border: 2px solid #3b82f6;
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
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
        
        .rich-text-editor hr {
          margin: 16px 0;
          border: none;
          height: 1px;
          background-color: #e5e7eb;
        }
        
        /* Clearfix para elementos flutuantes */
        .rich-text-editor::after {
          content: "";
          display: table;
          clear: both;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
