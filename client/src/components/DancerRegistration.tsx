import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

interface FormQuestion {
  id: string;
  text: string;
  type: 'text' | 'yesno' | 'multiplechoice' | 'consent';
  required: boolean;
  order: number;
  options?: string[];
  imageUrl?: string;
}

const DancerRegistration: React.FC = () => {
  const { auditionId } = useParams<{ auditionId?: string }>();
  const [auditionName, setAuditionName] = useState<string>('');
  const [clubName, setClubName] = useState<string>('MSU Dance Club');
  const [formData, setFormData] = useState({
    name: '',
    auditionNumber: '',
    email: '',
    phone: '',
    shirtSize: '',
    previousMember: '',
    previousLevel: ''
  });
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [questionResponses, setQuestionResponses] = useState<{ [questionId: string]: string | boolean }>({});
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [success, setSuccess] = useState(false);
  const [registeredInfo, setRegisteredInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch club name from public appearance endpoint
    const fetchClubName = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/appearance`);
        if (response.data.clubName) {
          setClubName(response.data.clubName);
        }
      } catch (error) {
        console.error('Error fetching club name:', error);
        // Keep default
      }
    };
    fetchClubName();
    
    // Fetch audition name and form questions if auditionId is provided
    if (auditionId) {
      fetchAuditionName();
      fetchFormQuestions();
    } else {
      setLoadingQuestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditionId]);

  const fetchAuditionName = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auditions/${auditionId}/public`
      );
      setAuditionName(response.data.name);
    } catch (error) {
      console.error('Error fetching audition name:', error);
    }
  };

  const fetchFormQuestions = async () => {
    if (!auditionId) return;
    
    try {
      setLoadingQuestions(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auditions/${auditionId}/form-questions`
      );
      const questions = response.data || [];
      setFormQuestions(questions.sort((a: FormQuestion, b: FormQuestion) => a.order - b.order));
      
      // Initialize responses for consent questions
      const initialResponses: { [key: string]: boolean } = {};
      questions.forEach((q: FormQuestion) => {
        if (q.type === 'consent' || q.type === 'yesno') {
          initialResponses[q.id] = false;
        }
      });
      setQuestionResponses(initialResponses);
    } catch (error) {
      console.error('Error fetching form questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields are filled
    if (!formData.name || !formData.auditionNumber || !formData.email || !formData.phone || !formData.shirtSize || !formData.previousMember) {
      toast.error('All fields are required');
      return;
    }

    // If previous member is "yes", validate level selection
    if (formData.previousMember === 'yes' && !formData.previousLevel) {
      toast.error('Please select your previous level');
      return;
    }

    // Validate required form questions
    const missingQuestions = formQuestions
      .filter(q => q.required && !questionResponses[q.id] && questionResponses[q.id] !== true)
      .map(q => q.text);
    
    if (missingQuestions.length > 0) {
      toast.error(`Please answer all required questions: ${missingQuestions.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/register`,
        {
          ...formData,
          auditionId: auditionId || null,
          formResponses: questionResponses // Include question responses for proof
        }
      );
      
      setRegisteredInfo({
        name: formData.name,
        auditionNumber: formData.auditionNumber,
        group: response.data.dancer?.group || 'Unassigned'
      });
      setSuccess(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again or see staff.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <Toaster position="top-center" />
      
      <div className="login-card">
        {/* Club Header - Dynamic Club Name */}
        <div className="msu-header" style={{ margin: '-3rem -3rem 2rem -3rem', borderRadius: '20px 20px 0 0' }}>
          <h1 style={{ fontSize: '2rem', margin: '0' }}>{clubName}</h1>
          <p className="subtitle" style={{ margin: '0.5rem 0 0 0' }}>Dancer Registration</p>
          {auditionName && (
            <p style={{ fontSize: '1.1rem', color: '#667eea', fontWeight: '600', margin: '0.5rem 0 0 0' }}>
              {auditionName}
            </p>
          )}
        </div>
        {success && registeredInfo ? (
          // Success Screen
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
              color: '#2d5a3d', 
              fontSize: '2rem', 
              marginBottom: '1rem',
              fontWeight: '700'
            }}>
              Registration Complete!
            </h1>
            
            <div style={{
              background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
              border: '2px solid #a8e6cf',
              borderRadius: '15px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <h3 style={{ marginTop: 0, color: '#495057', fontSize: '1.1rem' }}>Your Information:</h3>
              <div style={{ fontSize: '0.95rem', color: '#495057', lineHeight: '1.8' }}>
                <strong>Name:</strong> {registeredInfo.name}<br />
                <strong>Audition Number:</strong> #{registeredInfo.auditionNumber}<br />
                <strong>Previous Member:</strong> {formData.previousMember === 'yes' ? 'Yes' : 'No'}<br />
                {formData.previousMember === 'yes' && (
                  <>
                    <strong>Previous Level:</strong> {formData.previousLevel}<br />
                  </>
                )}
                <strong>Assigned Group:</strong> {registeredInfo.group}
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
              border: '2px solid #a8e6cf',
              borderRadius: '15px',
              padding: '1.25rem',
              color: '#2d5a3d',
              fontSize: '1rem',
              lineHeight: '1.6',
              fontWeight: '500'
            }}>
              <strong style={{ fontSize: '1.1rem' }}>Thank you!</strong><br />
              Make sure to submit your payment and check in. The audition process will begin shortly!
            </div>
          </div>
        ) : (
          // Registration Form
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ 
                color: '#6b5b95', 
                fontSize: '2rem', 
                marginBottom: '0.5rem',
                fontWeight: '700'
              }}>
                Dancer Registration
              </h1>
              <p style={{ color: '#8b7fb8', fontSize: '0.95rem' }}>
                Please fill out all fields to register for the audition
              </p>
            </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Full Name <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Audition Number <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.auditionNumber}
              onChange={(e) => setFormData({ ...formData, auditionNumber: e.target.value })}
              placeholder="Enter your audition number"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Email Address <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Phone Number <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
              required
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Shirt Size <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <select
              value={formData.shirtSize}
              onChange={(e) => setFormData({ ...formData, shirtSize: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: 'white'
              }}
            >
              <option value="">Select your shirt size</option>
              <option value="S">Small</option>
              <option value="M">Medium</option>
              <option value="L">Large</option>
              <option value="XL">XL</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Previous Club Member? <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <select
              value={formData.previousMember}
              onChange={(e) => setFormData({ ...formData, previousMember: e.target.value, previousLevel: e.target.value === 'no' ? '' : formData.previousLevel })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: 'white'
              }}
            >
              <option value="">Select an option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {formData.previousMember === 'yes' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">
                Previous Level <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={formData.previousLevel}
                onChange={(e) => setFormData({ ...formData, previousLevel: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #dee2e6',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select your previous level</option>
                <option value="Level 1">Level 1</option>
                <option value="Level 2">Level 2</option>
                <option value="Level 3">Level 3</option>
                <option value="Level 4">Level 4</option>
              </select>
            </div>
          )}

          {/* Dynamic Form Questions */}
          {loadingQuestions ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
              Loading questions...
            </div>
          ) : formQuestions.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '2px solid #dee2e6', paddingTop: '2rem' }}>
              <h3 style={{ color: '#6b5b95', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                Additional Information
              </h3>
              
              {formQuestions.map((question) => (
                <div key={question.id} style={{ marginBottom: '2rem' }}>
                  <label className="form-label">
                    {question.text}
                    {question.required && <span style={{ color: '#dc3545' }}> *</span>}
                  </label>
                  
                  {/* Display question image if present */}
                  {question.imageUrl && (
                    <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                      <img 
                        src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${question.imageUrl}`}
                        alt={question.text}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '400px',
                          borderRadius: '0.5rem',
                          border: '1px solid #dee2e6'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Render based on question type */}
                  {question.type === 'text' && (
                    <input
                      type="text"
                      value={questionResponses[question.id] as string || ''}
                      onChange={(e) => setQuestionResponses({
                        ...questionResponses,
                        [question.id]: e.target.value
                      })}
                      placeholder="Enter your answer"
                      required={question.required}
                      className="form-input"
                    />
                  )}
                  
                  {question.type === 'yesno' && (
                    <select
                      value={questionResponses[question.id] as string || ''}
                      onChange={(e) => setQuestionResponses({
                        ...questionResponses,
                        [question.id]: e.target.value
                      })}
                      required={question.required}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #dee2e6',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select an option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  )}
                  
                  {question.type === 'multiplechoice' && question.options && (
                    <select
                      value={questionResponses[question.id] as string || ''}
                      onChange={(e) => setQuestionResponses({
                        ...questionResponses,
                        [question.id]: e.target.value
                      })}
                      required={question.required}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #dee2e6',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select an option</option>
                      {question.options.map((option, idx) => (
                        <option key={idx} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  
                  {question.type === 'consent' && (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '0.5rem',
                      border: '2px solid #dee2e6'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                        gap: '0.75rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={questionResponses[question.id] === true}
                          onChange={(e) => setQuestionResponses({
                            ...questionResponses,
                            [question.id]: e.target.checked
                          })}
                          required={question.required}
                          style={{
                            marginTop: '0.25rem',
                            width: '1.25rem',
                            height: '1.25rem',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#495057', lineHeight: '1.5' }}>
                          I acknowledge that I have read and agree to the terms above.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              color: '#6c757d'
            }}>
              <strong>Important:</strong> All fields are required. Your audition number will determine your group assignment automatically.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DancerRegistration;

