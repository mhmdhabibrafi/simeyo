import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
const images = [];
for (const name of ['api', 'web', 'gateway', 'postgres']) {
  const report = JSON.parse(await readFile(`.local/image-audit/${name}.json`, 'utf8'));
  assert.ok(Array.isArray(report.Results) && report.Metadata?.OS?.Family, `Incomplete image scan: ${name}`);
  const findings = report.Results.flatMap(result => (result.Vulnerabilities ?? []).filter(item => ['HIGH', 'CRITICAL'].includes(item.Severity)).map(item => ({ target: result.Target, package: item.PkgName, installed: item.InstalledVersion, severity: item.Severity, id: item.VulnerabilityID, fixed: item.FixedVersion || null })));
  images.push({ name, artifact: report.ArtifactName, image_id: report.Metadata.ImageID, high: findings.filter(f => f.severity === 'HIGH').length, critical: findings.filter(f => f.severity === 'CRITICAL').length, findings });
}
const total = images.reduce((sum, image) => sum + image.high + image.critical, 0);
const summary = { scope: 'Fresh release/CI image HIGH and CRITICAL OS/application advisories; no ignore-unfixed or vulnerability suppression', accepted: total === 0, findings: total, images };
await writeFile('.local/image-audit/summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ accepted: summary.accepted, findings: total, images: images.map(({ findings, ...image }) => image) }, null, 2));
if (total) process.exitCode = 1;
