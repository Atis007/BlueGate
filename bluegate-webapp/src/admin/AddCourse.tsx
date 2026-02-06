import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './AddStudent.css';

export default function AddCourse() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nev: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nev.trim()) {
      newErrors.nev = 'A tantárgy neve kötelező';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('courses')
        .insert([
          {
            nev: formData.nev.trim(),
          },
        ])
        .select();

      if (error) {
        console.error('Hiba történt:', error);
        alert(`Hiba: ${error.message}`);
        return;
      }

      alert('A tantárgy sikeresen hozzáadva!');
      navigate('/admin/teachers');
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok mentése során');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-student-container">
      <div className="add-student-header">
        <button className="back-button" onClick={() => navigate('/admin/teachers')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1>Új Tantárgy Hozzáadása</h1>
      </div>

      <form className="student-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nev">Tantárgy neve</label>
          <input
            type="text"
            id="nev"
            className={errors.nev ? 'input-error' : ''}
            placeholder="Add meg a tantárgy nevét"
            value={formData.nev}
            onChange={(e) => updateField('nev', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.nev && <span className="error-text">{errors.nev}</span>}
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
                </svg>
                Mentés...
              </>
            ) : (
              'Mentés'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
