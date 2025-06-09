import React, { useState } from 'react';
import { grantApplicationSchema } from '../lib/validation/grantApplication';
import { z } from 'zod';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useFieldValidation } from '../lib/validation/useFieldValidation';

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

type GrantApplicationInput = z.infer<typeof grantApplicationSchema>;

const initialForm: GrantApplicationInput = {
  userId: '', // Set this from your auth context/session
  grantId: '',
  projectTitle: '',
  projectSummary: '',
  requestedAmount: 0,
  attachmentUrl: undefined,
};

export default function GrantApplicationForm({ userId, grantId }: { userId: string; grantId: string }) {
  const [form, setForm] = useState<GrantApplicationInput>({ ...initialForm, userId, grantId });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { values, errors, onChange, onBlur, setValue, reset } = useFieldValidation(grantApplicationSchema);

  // Upload file to /api/upload endpoint
  async function uploadFileToApi(file: File): Promise<string | undefined> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return undefined;
    const result = await response.json();
    return result.url as string | undefined;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setValue(name as keyof typeof values, type === 'number' ? Number(value) : value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    validateField(name as keyof GrantApplicationInput, type === 'number' ? Number(value) : value);
  };

  function validateField(field: keyof GrantApplicationInput, value: any) {
    let fieldSchema = grantApplicationSchema.shape[field];
    if (!fieldSchema) return;
    const result = fieldSchema.safeParse(value);
    setError(result.success ? null : result.error.errors[0].message);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only PDF and image files are allowed.');
        setFile(null);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError('File size must be less than 10MB.');
        setFile(null);
        return;
      }
      setFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    let attachmentUrl: string | undefined = undefined;
    if (file) {
      attachmentUrl = await uploadFileToApi(file);
      if (!attachmentUrl) {
        setError('File upload failed.');
        toast.error('File upload failed.');
        setLoading(false);
        return;
      }
    }

    // Validate client-side
    const parseResult = grantApplicationSchema.safeParse({ ...values, attachmentUrl });
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((err) => err.message).join(', ');
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    // Submit to API
    const response = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, attachmentUrl }),
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Submission failed');
      toast.error(result.error || 'Submission failed');
    } else {
      setSuccess('Application submitted!');
      toast.success('Application submitted!');
      reset();
      setFile(null);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="projectTitle" value={values.projectTitle} onChange={onChange('projectTitle')} onBlur={onBlur('projectTitle')} placeholder="Project Title" required />
        {errors.projectTitle && <div style={{ color: 'red' }}>{errors.projectTitle}</div>}
      </div>
      <div>
        <textarea name="projectSummary" value={values.projectSummary} onChange={onChange('projectSummary')} onBlur={onBlur('projectSummary')} placeholder="Project Summary" required />
        {errors.projectSummary && <div style={{ color: 'red' }}>{errors.projectSummary}</div>}
      </div>
      <div>
        <input name="requestedAmount" type="number" value={values.requestedAmount} onChange={onChange('requestedAmount')} onBlur={onBlur('requestedAmount')} placeholder="Requested Amount" required />
        {errors.requestedAmount && <div style={{ color: 'red' }}>{errors.requestedAmount}</div>}
      </div>
      <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
      <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
    </form>
  );
}
