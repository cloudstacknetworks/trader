/**
 * Feature Notes Module - Shared Feature Documentation Components
 * 
 * This module provides a complete feature notes system that can be imported
 * into any DeepAgent application. It includes:
 * 
 * - FeatureNoteList: Display and filter feature notes
 * - FeatureNoteForm: Submit new feature notes
 * - FeatureNoteDetails: View feature note details with version history
 * 
 * @example
 * ```tsx
 * import { FeatureNoteList, FeatureNoteForm, FeatureNoteDetails } from '@/components/feature-notes-shared';
 * 
 * function MyApp() {
 *   return (
 *     <div>
 *       <FeatureNoteList onFeatureClick={(id) => router.push(`/features/${id}`)} />
 *     </div>
 *   );
 * }
 * ```
 */

export { FeatureNoteList } from './feature-note-list';
export { FeatureNoteForm } from './feature-note-form';
export { FeatureNoteDetails } from './feature-note-details';
