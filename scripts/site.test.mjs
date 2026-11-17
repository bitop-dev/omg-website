import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const { outputText } = ts.transpileModule(read("lib/site.ts"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { site } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("current source and release links use the transferred repositories", () => {
  assert.equal(site.repoUrl, "https://github.com/bitop-dev/open-model-gateway");
  assert.equal(site.websiteRepoUrl, "https://github.com/bitop-dev/omg-website");
  assert.equal(site.currentImageRepository, "ghcr.io/bitop-dev/open-model-gateway");
  for (const key of [
    "releaseNotesUrl", "releasesUrl", "changelogUrl", "upgradeNotesUrl", "licenseUrl",
    "securityUrl", "roadmapUrl", "stagingUrl", "operationsUrl", "kubernetesUrl",
    "composeUrl", "inferenceOpenApiUrl",
  ]) {
    assert.ok(site[key].startsWith(`${site.repoUrl}/`), `${key} uses the current source repository`);
  }
});

test("the v0.10.0 image and signature retain their original release identity", () => {
  assert.equal(site.version, "v0.10.0");
  assert.equal(site.releaseDate, "2026-11-02");
  assert.equal(site.previousVersion, "v0.6.0");
  assert.deepEqual(site.image, {
    repository: "ghcr.io/ncecere/open-model-gateway",
    tag: "v0.10.0",
    digest: "sha256:77a37910d5af8ef26cdacec1f7dac026ba2aee32d9de8fd8ab30c039adbcdbe6",
    ref: "ghcr.io/ncecere/open-model-gateway:v0.10.0@sha256:77a37910d5af8ef26cdacec1f7dac026ba2aee32d9de8fd8ab30c039adbcdbe6",
    cosignIdentity: "https://github.com/ncecere/open-model-gateway/.github/workflows/image.yml@refs/tags/v0.10.0",
    cosignIssuer: "https://token.actions.githubusercontent.com",
  });
});

test("website publishing and OCI source metadata target the new organization", () => {
  const workflow = read(".github/workflows/publish.yaml");
  assert.ok(workflow.includes("ghcr.io/bitop-dev/omg-website:${{ github.sha }}"));
  assert.ok(workflow.includes("ghcr.io/bitop-dev/omg-website:latest"));
  assert.ok(!workflow.includes("ghcr.io/ncecere/"));
  assert.ok(workflow.includes("if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'"));
  assert.ok(workflow.includes("platforms: linux/amd64,linux/arm64"));
  assert.ok(read("Dockerfile").includes('org.opencontainers.image.source="https://github.com/bitop-dev/omg-website"'));
});
