import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

export default function NewProjectModal({ onClose, onProjectCreated }) {
  const [formData, setFormData] = useState({
    project_name: '',
    client_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: dbError } = await supabase
        .from('projects') // Strictly lowercase table
        .insert([{
          project_name: formData.project_name,
          client_name: formData.client_name
        }]);

      if (dbError) throw dbError;

      onProjectCreated();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Create New Project</h3>
        {error && <div className="alert error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="project_name">Project Name</label>
            <input
              type="text"
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({...formData, project_name: e.target.value})}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="client_name">Client Name</label>
            <input
              type="text"
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({...formData, client_name: e.target.value})}
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading} style={{margin: 0}}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
