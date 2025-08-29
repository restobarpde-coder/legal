"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"

interface Matter {
  id: string
  title: string
  clients: {
    first_name: string
    last_name: string
    company_name: string | null
    client_type: "individual" | "company"
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string | null
  client_type: "individual" | "company"
}

interface DocumentUploadFormProps {
  matters: Matter[]
  clients: Client[]
}

export function DocumentUploadForm({ matters, clients }: DocumentUploadFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    document_type: "",
    is_confidential: false,
    matter_id: "",
    client_id: "",
    tags: "",
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: file.name }));
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, name: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!selectedFile) {
      setError("Por favor selecciona un archivo");
      setIsLoading(false);
      return;
    }

    try {
      // In a real application, you would upload the file to a storage service
      // For this demo, we'll simulate the file upload
      const simulatedFilePath = `/documents/${Date.now()}_${selectedFile.name}`;
      
      const submitData = {
        name: formData.name || selectedFile.name,
        description: formData.description || null,
        file_path: simulatedFilePath,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        document_type: formData.document_type || null,
        is_confidential: formData.is_confidential,
        matter_id: formData.matter_id || null,
        client_id: formData.client_id || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        version: 1,
      };

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push("/dashboard/documents");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al subir el documento");
      }
    } catch (error) {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const getClientName = (client: Client | Matter['clients']) => {
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`;
    }
    return `${client.first_name} ${client.last_name}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Subir Documento</CardTitle>
        <CardDescription>
          Selecciona un archivo y completa la información del documento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="grid gap-2">
            <Label>Archivo *</Label>
            {!selectedFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Arrastra un archivo aquí o haz clic para seleccionar
                  </p>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>\
