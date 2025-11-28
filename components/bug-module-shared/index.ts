/**
 * Bug Module - Shared Bug Tracking Components
 * 
 * This module provides a complete bug tracking system that can be imported
 * into any DeepAgent application. It includes:
 * 
 * - BugList: Display and filter bugs
 * - BugForm: Submit new bugs
 * - BugDetails: View bug details with activity tracking
 * 
 * @example
 * ```tsx
 * import { BugList, BugForm, BugDetails } from '@/components/bug-module';
 * 
 * function MyApp() {
 *   return (
 *     <div>
 *       <BugList onBugClick={(id) => router.push(`/bugs/${id}`)} />
 *     </div>
 *   );
 * }
 * ```
 */

export { BugList } from './bug-list';
export { BugForm } from './bug-form';
export { BugDetails } from './bug-details';