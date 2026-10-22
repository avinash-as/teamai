// DAG task scheduler: compute execution waves from agent dependencies
export function computeWaves(agents) {
  const deps = (a) => a.dependsOn || [];
  const waves = [];
  const remaining = [...agents];
  const done = new Set();
  while (remaining.length > 0) {
    const wave = remaining.filter(a => deps(a).every(d => done.has(d)));
    if (wave.length === 0) {
      // circular or missing dependency: run rest in parallel
      waves.push([...remaining]);
      remaining.forEach(a => done.add(a.id));
      remaining.length = 0;
      break;
    }
    waves.push(wave);
    wave.forEach(a => done.add(a.id));
    wave.forEach(a => {
      const idx = remaining.indexOf(a);
      if (idx >= 0) remaining.splice(idx, 1);
    });
  }
  return waves;
}

// Detect conflicts: agents modifying the same file
export function detectConflicts(changes) {
  const fileMap = {};
  const conflicts = [];
  for (const change of changes) {
    for (const file of change.files || []) {
      if (fileMap[file] && fileMap[file] !== change.agentId) {
        conflicts.push({ file, agents: [fileMap[file], change.agentId] });
      }
      fileMap[file] = change.agentId;
    }
  }
  return conflicts;
}