import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { hash } from 'bcryptjs';
import { supabase } from '../lib/supabase';
import './AddStudent.css';

export default function EditStudent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    nev: '',
    indexszam: '',
    jelszo: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (id) {
      fetchStudent();
    }
  }, [id]);

  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('diak')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Hiba történt:', error);
        alert('Hiba történt az adatok betöltése során');
        navigate('/admin/students');
        return;
      }

      if (data) {
        setFormData({
          nev: data.nev,
          indexszam: data.indexszam,
          jelszo: '', // Don't show the hashed password, leave empty for new password input
        });
      }
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok betöltése során');
      navigate('/admin/students');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nev.trim()) {
      newErrors.nev = 'A név megadása kötelező';
    }

    if (!formData.indexszam.trim()) {
      newErrors.indexszam = 'Az index szám megadása kötelező';
    }

    // Password is optional when editing - only validate if provided
    if (formData.jelszo.trim() && formData.jelszo.length < 6) {
      newErrors.jelszo = 'A jelszónak legalább 6 karakter hosszúnak kell lennie';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare update data
      const updateData: { nev: string; indexszam: string; jelszo?: string } = {
        nev: formData.nev,
        indexszam: formData.indexszam,
      };

      // Only update password if a new one was provided
      if (formData.jelszo.trim()) {
        updateData.jelszo = await hash(formData.jelszo, 10);
      }

      const { error } = await supabase
        .from('diak')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Hiba történt:', error);
        alert(`Hiba: ${error.message}`);
        return;
      }

      alert('A diák adatai sikeresen frissítve!');
      navigate('/admin/students');
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok mentése során');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  if (isLoading) {
    return (
      <div className="add-student-container">
        <div className="loading-state" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
            <circle cx="12" cy="12" r="10" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
          </svg>
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-student-container">
      <div className="add-student-header">
        <button className="back-button" onClick={() => navigate('/admin/students')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Diák Szerkesztése</h1>
      </div>

      <form className="student-form" onSubmit={handleSubmit}>
        {/* Név */}
        <div className="form-group">
          <label htmlFor="nev">Név</label>
          <input
            type="text"
            id="nev"
            className={errors.nev ? 'input-error' : ''}
            placeholder="Adja meg a nevet"
            value={formData.nev}
            onChange={(e) => updateField('nev', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.nev && <span className="error-text">{errors.nev}</span>}
        </div>

        {/* Index szám */}
        <div className="form-group">
          <label htmlFor="indexszam">Index szám</label>
          <input
            type="text"
            id="indexszam"
            className={errors.indexszam ? 'input-error' : ''}
            placeholder="Adja meg az index számot"
            value={formData.indexszam}
            onChange={(e) => updateField('indexszam', e.target.value.toUpperCase())}
            disabled={isSubmitting}
          />
          {errors.indexszam && <span className="error-text">{errors.indexszam}</span>}
        </div>

        {/* Jelszó */}
        <div className="form-group">
          <label htmlFor="jelszo">Új jelszó (opcionális)</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="jelszo"
              className={errors.jelszo ? 'input-error' : ''}
              placeholder="Hagyja üresen, ha nem szeretné módosítani"
              value={formData.jelszo}
              onChange={(e) => updateField('jelszo', e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {errors.jelszo && <span className="error-text">{errors.jelszo}</span>}
        </div>

        {/* Gomb */}
        <div className="button-group">
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
                </svg>
                Mentés...
              </>
            ) : (
              'Módosítások Mentése'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
