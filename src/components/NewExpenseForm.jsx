import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './NewExpenseForm.css';

export default function NewExpenseForm({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Category: 'Materials',
    Cost_Amount: '',
    Hours_Worked: '',
    Receipt_Image: null
  });

  const isLabor = formData.Category === 'Labor';

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

    try {
      // In a real app, you would upload the file to Supabase Storage first,
      // then get the public URL to save in the Database.
      let receiptPath = null;
      if (!isLabor && formData.Receipt_Image) {
        receiptPath = formData.Receipt_Image.name; // Placeholder
      }

      const { data, error: dbError } = await supabase
        .from('Expenses_and_Hours')
        .insert([
          {
            Project_Link: projectId, // Passed directly via props
            Date: formData.Date,
            Category: formData.Category,
            Cost_Amount: isLabor ? 0 : parseFloat(formData.Cost_Amount || 0),
            Hours_Worked: isLabor ? parseFloat(formData.Hours_Worked || 0) : 0,
            Receipt_Image: receiptPath
          }
        ]);

      if (dbError) throw dbError;

      setSuccess(true);
      // Reset form but keep project link and date
      setFormData({
        ...formData,
        Category: 'Materials',
        Cost_Amount: '',
        Hours_Worked: '',
        Receipt_Image: null
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
        {/* Project Link is now managed automatically and hidden from UI */}
        
        <div className="form-group">
          <label htmlFor="Date">Date</label>
          <input
            type="date"
            id="Date"
            name="Date"
            value={formData.Date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="Category">Category</label>
          <select
            id="Category"
            name="Category"
            value={formData.Category}
            onChange={handleChange}
            required
          >
            <option value="Cabinets">Cabinets</option>
            <option value="Countertops">Countertops</option>
            <option value="Materials">Materials</option>
            <option value="Subcontractor">Subcontractor</option>
            <option value="Labor">Mano de Obra (Labor)</option>
          </select>
        </div>

        {isLabor ? (
          <div className="form-group slide-down">
            <label htmlFor="Hours_Worked">Hours Worked</label>
            <input
              type="number"
              step="0.25"
              min="0"
              id="Hours_Worked"
              name="Hours_Worked"
              value={formData.Hours_Worked}
              onChange={handleChange}
              placeholder="e.g. 4.5"
              required
            />
          </div>
        ) : (
          <>
            <div className="form-group slide-down">
              <label htmlFor="Cost_Amount">Cost Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="Cost_Amount"
                name="Cost_Amount"
                value={formData.Cost_Amount}
                onChange={handleChange}
                placeholder="e.g. 150.00"
                required
              />
            </div>

            <div className="form-group slide-down">
              <label htmlFor="Receipt_Image">Receipt Image</label>
              <input
                type="file"
                id="Receipt_Image"
                name="Receipt_Image"
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
