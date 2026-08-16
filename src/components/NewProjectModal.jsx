import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

export default function NewProjectModal({ onClose, onProjectCreated }) {
  const [formData, setFormData] = useState({
    Project_Name: '',
    Client_Name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('Projects')
        .insert([{
          Project_Name: formData.Project_Name,
          Client_Name: formData.Client_Name,
          Status: 'Planning', // Default enum value
          Base_Contract_Value: 0,
          Deposit_Received: 0,
          Start_Date: new Date().toISOString().split('T')[0]
        }])
        .select();

      if (dbError) throw dbError;

      onProjectCreated(data[0]);
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
            <label htmlFor="Project_Name">Project Name</label>
            <input
              type="text"
              id="Project_Name"
              value={formData.Project_Name}
              onChange={(e) => setFormData({...formData, Project_Name: e.target.value})}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="Client_Name">Client Name</label>
            <input
              type="text"
              id="Client_Name"
              value={formData.Client_Name}
              onChange={(e) => setFormData({...formData, Client_Name: e.target.value})}
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
