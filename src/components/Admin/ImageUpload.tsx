import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Link } from 'lucide-react';
import { apiClient } from '@/utils/api';
import { toast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label = "Imagem" }) => {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');

  // Initialize with existing value
  useEffect(() => {
    if (value) {
      setPreviewUrl(value);
      setUrlInput(value);
      setActiveTab('url');
    }
  }, [value]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Create blob URL for immediate preview
      const blobUrl = URL.createObjectURL(file);
      setPreviewUrl(blobUrl);
      setLocalImageFile(file);
      
      console.log('Created blob URL for preview:', blobUrl);
      
      // Update form with blob URL immediately for local preview
      onChange(blobUrl);
      
      setUploading(true);
      try {
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
          
          console.log('Upload successful, server URL:', serverUrl);
          
          // Store server URL for form submission, but keep blob URL for preview
          onChange(serverUrl);
          
          toast({
            title: 'Upload concluído!',
            description: 'A imagem foi enviada com sucesso.',
          });
        } else {
          // If upload fails, revert
          URL.revokeObjectURL(blobUrl);
          setPreviewUrl('');
          setLocalImageFile(null);
          onChange('');
          throw new Error('Falha no upload');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        URL.revokeObjectURL(blobUrl);
        setPreviewUrl('');
        setLocalImageFile(null);
        onChange('');
        toast({
          title: 'Erro no upload',
          description: 'Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: false,
  });

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    setPreviewUrl(url);
    onChange(url);
    // Clear any local file when using URL
    if (localImageFile) {
      URL.revokeObjectURL(previewUrl);
      setLocalImageFile(null);
    }
  };

  const clearImage = () => {
    // Revoke blob URL if it exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    onChange('');
    setUrlInput('');
    setPreviewUrl('');
    setLocalImageFile(null);
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'url' | 'upload')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL da Imagem
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Fazer Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://exemplo.com/imagem.jpg"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            {previewUrl && (
              <Button type="button" variant="outline" size="sm" onClick={clearImage}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {uploading
                ? 'Enviando...'
                : isDragActive
                ? 'Solte a imagem aqui'
                : 'Arraste uma imagem ou clique para selecionar'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF até 10MB</p>
          </div>
          
          {previewUrl && (
            <div className="flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={clearImage}>
                <X className="h-4 w-4 mr-2" />
                Remover Imagem
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {previewUrl && (
        <div className="mt-4">
          <Label className="text-sm text-gray-600">Prévia:</Label>
          <div className="mt-2 relative inline-block">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-64 max-h-48 object-cover rounded-lg border"
              onLoad={() => console.log('Image loaded successfully:', previewUrl)}
              onError={(e) => {
                console.error('Error loading image:', previewUrl, e);
                toast({
                  title: 'Erro ao carregar imagem',
                  description: 'Verifique se a URL está correta.',
                  variant: 'destructive',
                });
              }}
            />
            {uploading && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                Carregando...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
