import Today from './screens/Today';

// Plan, Review and Settings don't exist yet (later phases) — App is a thin shell
// around the one real screen until nav.ts's stack has somewhere else to point.
export default function App() {
  return <Today />;
}
