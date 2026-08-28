import { useState } from 'react';
import { Modal } from './ui';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';

const CRM_FIELDS = [
  { value: '', label: '— Ignore this column —' },
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'designation', label: 'Designation' },
  { value: 'event_date', label: 'Event Date' },
  { value: 'venue', label: 'Venue' },
  { value: 'link', label: 'Registration Link' },
];

export default function ImportWizard({ events, onClose, onComplete }) {
  const toast = useToast();
  const [step, setStep] = useState(1); // 1 upload, 2 map, 3 validate, 4 confirm result
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [mapping, setMapping] = useState({});
  const [eventId, setEventId] = useState('');
  const [validation, setValidation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function handleUpload() {
    if (!file) return toast.push('Please choose a file first.', 'error');
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/contacts/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(data);
      setMapping(data.suggestedMapping || {});
      setStep(2);
    } catch (err) {
      toast.push(errorMessage(err, 'Could not read the file.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    setBusy(true);
    try {
      const { data } = await api.post('/contacts/import/validate', {
        importId: uploadResult.importId,
        mapping,
      });
      setValidation(data);
      setStep(3);
    } catch (err) {
      toast.push(errorMessage(err, 'Validation failed.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const { data } = await api.post('/contacts/import/confirm', {
        importId: uploadResult.importId,
        mapping,
        event_id: eventId || null,
      });
      setResult(data);
      setStep(4);
    } catch (err) {
      toast.push(errorMessage(err, 'Import failed.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const hasRequiredMapping = Object.values(mapping).includes('name') && Object.values(mapping).includes('phone');

  return (
    <Modal
      title="Import Contacts from Excel/CSV"
      onClose={onClose}
      wide
      footer={(
        <>
          {step > 1 && step < 4 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
          {step === 1 && <button className="btn btn-primary" onClick={handleUpload} disabled={busy || !file}>{busy ? 'Uploading...' : 'Upload & Continue'}</button>}
          {step === 2 && <button className="btn btn-primary" onClick={handleValidate} disabled={busy || !hasRequiredMapping}>{busy ? 'Validating...' : 'Validate'}</button>}
          {step === 3 && <button className="btn btn-primary" onClick={handleConfirm} disabled={busy || !validation?.readyToImport}>{busy ? 'Importing...' : `Import ${validation?.readyToImport || 0} Contacts`}</button>}
          {step === 4 && <button className="btn btn-primary" onClick={onComplete}>Done</button>}
        </>
      )}
    >
      <div className="stepper">
        {['Upload File', 'Map Columns', 'Validate', 'Confirm'].map((label, i) => (
          <div key={label} className={`step-pill ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>{label}</div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <p className="text-sm muted mb-16">Upload a CSV export of your contact list. The first row should contain column headers.</p>
          <div className="field">
            <label>File</label>
            <input type="file" accept=".csv,.txt" onChange={(e) => setFile(e.target.files[0])} />
          </div>
        </div>
      )}

      {step === 2 && uploadResult && (
        <div>
          <p className="text-sm muted mb-16">
            Detected {uploadResult.totalRows} rows and {uploadResult.columns.length} columns. Map each source column to a CRM field.
            <strong> Name</strong> and <strong>Phone</strong> are required.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>CSV Column</th><th>Maps To</th><th>Sample Value</th></tr></thead>
              <tbody>
                {uploadResult.columns.map((col) => (
                  <tr key={col}>
                    <td>{col}</td>
                    <td>
                      <select value={mapping[col] || ''} onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}>
                        {CRM_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </td>
                    <td className="muted text-sm">{uploadResult.preview[0]?.[col] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hasRequiredMapping && (
            <p className="text-sm" style={{ color: 'var(--color-danger)', marginTop: 10 }}>
              Please map at least one column to Name and one to Phone.
            </p>
          )}
          <div className="field" style={{ marginTop: 16 }}>
            <label>Assign imported contacts to Event (optional)</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">No event</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {step === 3 && validation && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="label">Total Rows</div><div className="value">{validation.total}</div></div>
            <div className="stat-card"><div className="label">Valid</div><div className="value" style={{ color: 'var(--color-success)' }}>{validation.valid}</div></div>
            <div className="stat-card"><div className="label">Invalid</div><div className="value" style={{ color: 'var(--color-danger)' }}>{validation.invalid}</div></div>
            <div className="stat-card"><div className="label">Duplicates</div><div className="value" style={{ color: 'var(--color-warning)' }}>{validation.duplicates}</div></div>
          </div>
          <p className="text-sm mb-16"><strong>{validation.readyToImport}</strong> contacts are ready to import.</p>
          {validation.rows.some((r) => !r.valid) && (
            <>
              <div className="section-title"><h3 style={{ fontSize: 14 }}>Rows with issues</h3></div>
              <div className="table-wrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Row</th><th>Name</th><th>Phone</th><th>Issue</th></tr></thead>
                  <tbody>
                    {validation.rows.filter((r) => !r.valid).slice(0, 100).map((r) => (
                      <tr key={r.rowIndex}>
                        <td>{r.rowIndex}</td>
                        <td>{r.mappedData.name || '—'}</td>
                        <td>{r.mappedData.phone || '—'}</td>
                        <td className="text-sm" style={{ color: 'var(--color-danger)' }}>
                          {r.isDuplicate ? 'Duplicate phone number' : r.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {step === 4 && result && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <h3 style={{ color: 'var(--color-success)' }}>Import Complete</h3>
          <p className="muted">Successfully imported {result.imported} of {result.summary.totalRows} rows.</p>
          <div className="stats-grid" style={{ marginTop: 20 }}>
            <div className="stat-card"><div className="label">Imported</div><div className="value" style={{ color: 'var(--color-success)' }}>{result.summary.imported}</div></div>
            <div className="stat-card"><div className="label">Invalid</div><div className="value">{result.summary.invalid}</div></div>
            <div className="stat-card"><div className="label">Duplicates</div><div className="value">{result.summary.duplicates}</div></div>
          </div>
        </div>
      )}
    </Modal>
  );
}
