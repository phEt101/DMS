import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'

export default function NotesSection({ form }: { form: UseFormReturn<Survey> }) {
  return (
    <section className="dms-pm-create-section">
      <label className="dms-form-field dms-form-field--full">
        <span className="dms-form-label">Notes</span>
        <textarea className="dms-form-input dms-form-textarea" {...form.register('notes')} />
      </label>
    </section>
  )
}
