import { unstable_noStore } from 'next/cache';

async function getLiveData() {
  unstable_noStore();
  return {
    value: Math.random(),
    timestamp: new Date().toISOString(),
  };
}

export default async function Page() {
  const data = await getLiveData();
  return (
    <main>
      <h1>Live Dashboard</h1>
      <p>Value: {data.value.toFixed(4)}</p>
      <p>Last updated: {data.timestamp}</p>
    </main>
  );
}
