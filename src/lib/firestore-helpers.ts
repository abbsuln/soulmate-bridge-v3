import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

export function mapDocs<T = DocumentData>(snapshot: QuerySnapshot<DocumentData>): (T & { id: string })[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
}
