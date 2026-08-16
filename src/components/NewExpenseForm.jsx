import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './NewExpenseForm.css';

export default function NewExpenseForm({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [projectsList, setProjectsList] = useState([]);

  useEffect(() => {
    // Fetch all projects for the dropdown
    const fetchProjectsList = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('projects')
          .select('id, project_name')
          .order('project_name');
        
        if (!dbError && data) {
          setProjectsList(data);
        }
      } catch (err) {
        console.error("Failed to load projects list", err);
      }
    };
    fetchProjectsList();
  }, []);

  const [formData, setFormData] = useState({
    project_id: projectId || '', // Use prop if passed, otherwise empty
    date: new Date().toISOString().split('T')[0],
    category: 'Materiales',
    cost_amount: '',
    hours_worked: '',
    receipt_image_url: null
  });

  const isLabor = formData.category === 'Mano de Obra';

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!supabase) {
      setError('Supabase client is not initialized. Please check your .env.local file.');
      setLoading(false);
      return;
    }

    if (!formData.project_id) {
      setError('Please select a project.');
      setLoading(false);
      return;
    }

    try {
      let receiptPath = null;
      if (!isLabor && formData.receipt_image_url) {
        receiptPath = formData.receipt_image_url.name; // Placeholder string
      }

      const { error: dbError } = await supabase
        .from('expenses_and_hours') // Strictly lowercase table
        .insert([
          {
            project_id: formData.project_id,
            date: formData.date,
            category: formData.category,
            cost_amount: isLabor ? 0 : parseFloat(formData.cost_amount || 0),
            hours_worked: isLabor ? parseFloat(formData.hours_worked || 0) : 0,
            receipt_image_url: receiptPath
          }
        ]);

      if (dbError) throw dbError;

      setSuccess(true);
      // Reset form but keep project_id and date
      setFormData({
        ...formData,
        category: 'Materiales',
        cost_amount: '',
        hours_worked: '',
        receipt_image_url: null
      });
    } catch (err) {
      console.error("Detailed Submission Error:", err);
      setError(err.message || 'An error occurred while saving the record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Log Expense or Hours</h2>
      
      {success && <div className="alert success">Record saved successfully!</div>}
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit} className="expense-form">
        
        {/* Project Selection Dropdown */}
        <div className="form-group">
          <label htmlFor="project_id">Select Project</label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id}
            onChange={handleChange}
            required
          >
            <option value="" disabled>-- Choose a Project --</option>
            {projectsList.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.project_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="Cabinets">Cabinets</option>
            <option value="Countertops">Countertops</option>
            <option value="Materiales">Materiales</option>
            <option value="Subcontratista">Subcontratista</option>
            <option value="Mano de Obra">Mano de Obra</option>
          </select>
        </div>

        {isLabor ? (
          <div className="form-group slide-down">
            <label htmlFor="hours_worked">Hours Worked</label>
            <input
              type="number"
              step="0.25"
              min="0"
              id="hours_worked"
              name="hours_worked"
              value={formData.hours_worked}
              onChange={handleChange}
              placeholder="e.g. 4.5"
              required
            />
          </div>
        ) : (
          <>
            <div className="form-group slide-down">
              <label htmlFor="cost_amount">Cost Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="cost_amount"
                name="cost_amount"
                value={formData.cost_amount}
                onChange={handleChange}
                placeholder="e.g. 150.00"
                required
              />
            </div>

            <div className="form-group slide-down">
              <label htmlFor="receipt_image_url">Receipt Image</label>
              <input
                type="file"
                id="receipt_image_url"
                name="receipt_image_url"
                accept="image/*"
                capture="environment"
                onChange={handleChange}
              />
              <small>Take a photo or upload receipt</small>
            </div>
          </>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Saving...' : 'Save Record'}
        </button>
      </form>
    </div>
  );
}
