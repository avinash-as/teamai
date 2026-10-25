async function runDAG(tasks, executor, { retries = 2, signal } = {}) {
  const results = {};
  const remaining = [...tasks];
  const done = new Set();
  const failed = new Set();
  while (remaining.length > 0) {
    if (signal?.aborted) throw new Error("Cancelled");
    const wave = remaining.filter((t) => (t.dependsOn || []).every((d) => done.has(d) || failed.has(d)));
    if (wave.length === 0) {
      wave.push(...remaining);
    }
    await Promise.all(wave.map(async (t) => {
      let attempt = 0;
      while (attempt <= retries) {
        try {
          if (signal?.aborted) throw new Error("Cancelled");
          results[t.id] = await executor(t, results);
          done.add(t.id);
          return;
        } catch (e) {
          attempt++;
          if (attempt > retries) { failed.add(t.id); results[t.id] = { error: e.message }; }
          else await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }));
    wave.forEach((t) => {
      const idx = remaining.indexOf(t);
      if (idx >= 0) remaining.splice(idx, 1);
    });
  }
  return { results, failed: [...failed] };
}

export { runDAG };