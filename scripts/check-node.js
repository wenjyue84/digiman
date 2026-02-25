const major = Number(process.versions.node.split('.')[0]);
if (Number.isNaN(major) || major < 18) {
  console.error(`\n[Error] Node.js 18+ is required. Detected ${process.versions.node}.`);
  console.error('Please upgrade Node.js and retry.\n');
  process.exit(1);
}
