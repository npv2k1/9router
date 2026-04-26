"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Badge, Input, Modal, Select, Toggle } from "@/shared/components";

export default function AddApiKeyModal({ isOpen, provider, providerName, isCompatible, isAnthropic, authType, authHint, website, proxyPools, onSave, onClose }) {
  const NONE_PROXY_POOL_VALUE = "__none__";
  const isOllamaLocal = provider === "ollama-local";
  const isCookie = authType === "cookie";
  const credentialLabel = isCookie ? "Cookie Value" : "API Key";
  const credentialPlaceholder = isCookie
    ? (provider === "grok-web" ? "sso=xxxxx... or just the raw value" : "eyJhbGciOi...")
    : "";

  const isAzure = provider === "azure";
  const canBulk = !isOllamaLocal && !isAzure && !isCookie;

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkKeys, setBulkKeys] = useState("");
  const [namePrefix, setNamePrefix] = useState("Key");

  const [formData, setFormData] = useState({
    name: "",
    apiKey: "",
    priority: 1,
    proxyPoolId: NONE_PROXY_POOL_VALUE,
    ollamaHostUrl: "",
  });
  const [azureData, setAzureData] = useState({
    azureEndpoint: "",
    apiVersion: "2024-10-01-preview",
    deployment: "",
    organization: "",
  });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const parsedBulkKeys = bulkKeys
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const buildProviderSpecificData = () => {
    if (isOllamaLocal && formData.ollamaHostUrl.trim()) {
      return { baseUrl: formData.ollamaHostUrl.trim() };
    }
    if (isAzure) {
      return {
        azureEndpoint: azureData.azureEndpoint,
        apiVersion: azureData.apiVersion,
        deployment: azureData.deployment,
        organization: azureData.organization,
      };
    }
    return undefined;
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/providers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: formData.apiKey, providerSpecificData: buildProviderSpecificData() }),
      });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch {
      setValidationResult("failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!provider) return;

    setSaving(true);
    try {
      if (isBulkMode && canBulk) {
        if (parsedBulkKeys.length === 0) return;
        const prefix = namePrefix.trim() || "Key";
        const keys = parsedBulkKeys.map((apiKey, i) => ({
          name: parsedBulkKeys.length === 1 ? prefix : `${prefix} ${i + 1}`,
          apiKey,
        }));
        await onSave({
          keys,
          priority: formData.priority,
          proxyPoolId: formData.proxyPoolId === NONE_PROXY_POOL_VALUE ? null : formData.proxyPoolId,
          testStatus: "unknown",
          providerSpecificData: buildProviderSpecificData(),
        });
      } else {
        if (!isOllamaLocal && !formData.apiKey) return;
        if (!isOllamaLocal && !formData.name) return;

        let isValid = false;
        try {
          setValidating(true);
          setValidationResult(null);
          const res = await fetch("/api/providers/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider, apiKey: formData.apiKey, providerSpecificData: buildProviderSpecificData() }),
          });
          const data = await res.json();
          isValid = !!data.valid;
          setValidationResult(isValid ? "success" : "failed");
        } catch {
          setValidationResult("failed");
        } finally {
          setValidating(false);
        }

        await onSave({
          name: formData.name || (isOllamaLocal ? "Ollama Local" : ""),
          apiKey: formData.apiKey,
          priority: formData.priority,
          proxyPoolId: formData.proxyPoolId === NONE_PROXY_POOL_VALUE ? null : formData.proxyPoolId,
          testStatus: isValid ? "active" : "unknown",
          providerSpecificData: buildProviderSpecificData(),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!provider) return null;

  return (
    <Modal isOpen={isOpen} title={`Add ${providerName || provider} ${credentialLabel}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {canBulk && (
          <Toggle
            label="Add Multiple Keys"
            checked={isBulkMode}
            onChange={setIsBulkMode}
            size="sm"
          />
        )}

        {isBulkMode && canBulk ? (
          <>
            <Input
              label="Name Prefix"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="Key"
              hint="Keys will be named: Prefix 1, Prefix 2, …"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-main">API Keys (one per line)</label>
              <textarea
                value={bulkKeys}
                onChange={(e) => setBulkKeys(e.target.value)}
                placeholder="sk-key-1&#10;sk-key-2&#10;sk-key-3"
                rows={6}
                className="w-full py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md placeholder-text-muted/60 focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none transition-all shadow-inner resize-none"
              />
              {parsedBulkKeys.length > 0 && (
                <p className="text-xs text-text-muted">
                  {parsedBulkKeys.length} key{parsedBulkKeys.length !== 1 ? "s" : ""} detected
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isOllamaLocal ? "Ollama Local" : "Production Key"}
            />
            {isOllamaLocal && (
              <div className="flex gap-2">
                <Input
                  label="Ollama Host URL"
                  value={formData.ollamaHostUrl}
                  onChange={(e) => setFormData({ ...formData, ollamaHostUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="flex-1"
                />
                <div className="pt-6">
                  <Button onClick={handleValidate} disabled={validating || saving} variant="secondary">
                    {validating ? "Checking..." : "Check"}
                  </Button>
                </div>
              </div>
            )}
            {!isOllamaLocal && (
              <div className="flex gap-2">
                <Input
                  label={credentialLabel}
                  type={isCookie ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={credentialPlaceholder}
                  className="flex-1"
                />
                <div className="pt-6">
                  <Button onClick={handleValidate} disabled={!formData.apiKey || validating || saving} variant="secondary">
                    {validating ? "Checking..." : "Check"}
                  </Button>
                </div>
              </div>
            )}
            {isCookie && authHint && (
              <p className="text-xs text-text-muted">
                {authHint}
                {website && (
                  <>
                    {" "}
                    <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Open {website.replace(/^https?:\/\//, "")}
                    </a>
                  </>
                )}
              </p>
            )}
            {isOllamaLocal && (
              <p className="text-xs text-text-muted">
                Leave blank to use <code>http://localhost:11434</code>. For remote Ollama, enter the full host URL (e.g. <code>http://192.168.1.10:11434</code>).
              </p>
            )}
            {validationResult && (
              <Badge variant={validationResult === "success" ? "success" : "error"}>
                {validationResult === "success" ? "Valid" : "Invalid"}
              </Badge>
            )}
            {isCompatible && (
              <p className="text-xs text-text-muted">
                {isAnthropic 
                  ? `Validation checks ${providerName || "Anthropic Compatible"} by verifying the API key.`
                  : `Validation checks ${providerName || "OpenAI Compatible"} via /models on your base URL.`
                }
              </p>
            )}
            {isAzure && (
              <div className="bg-sidebar/50 p-4 rounded-lg border border-accent/20">
                <h3 className="font-semibold mb-3 text-sm">Azure OpenAI Configuration</h3>
                <div className="flex flex-col gap-3">
                  <Input
                    label="Azure Endpoint"
                    value={azureData.azureEndpoint}
                    onChange={(e) => setAzureData({ ...azureData, azureEndpoint: e.target.value })}
                    placeholder="https://your-resource.openai.azure.com"
                  />
                  <Input
                    label="Deployment Name"
                    value={azureData.deployment}
                    onChange={(e) => setAzureData({ ...azureData, deployment: e.target.value })}
                    placeholder="gpt-4"
                  />
                  <Input
                    label="API Version"
                    value={azureData.apiVersion}
                    onChange={(e) => setAzureData({ ...azureData, apiVersion: e.target.value })}
                    placeholder="2024-10-01-preview"
                  />
                  <Input
                    label="Organization"
                    value={azureData.organization}
                    onChange={(e) => setAzureData({ ...azureData, organization: e.target.value })}
                    placeholder="Organization ID"
                  />
                </div>
              </div>
            )}
          </>
        )}

        <Input
          label="Priority"
          type="number"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) || 1 })}
        />

        <Select
          label="Proxy Pool"
          value={formData.proxyPoolId}
          onChange={(e) => setFormData({ ...formData, proxyPoolId: e.target.value })}
          options={[
            { value: NONE_PROXY_POOL_VALUE, label: "None" },
            ...(proxyPools || []).map((pool) => ({ value: pool.id, label: pool.name })),
          ]}
          placeholder="None"
        />

        {(proxyPools || []).length === 0 && (
          <p className="text-xs text-text-muted">
            No active proxy pools available. Create one in Proxy Pools page first.
          </p>
        )}

        <p className="text-xs text-text-muted">
          Legacy manual proxy fields are still accepted by API for backward compatibility.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            fullWidth
            disabled={
              saving ||
              (isBulkMode && canBulk
                ? parsedBulkKeys.length === 0
                : (!isOllamaLocal && (!formData.name || !formData.apiKey)) ||
                  (isAzure && (!azureData.azureEndpoint || !azureData.deployment || !azureData.organization))
              )
            }
          >
            {saving
              ? "Saving..."
              : isBulkMode && canBulk
              ? `Save ${parsedBulkKeys.length > 0 ? `${parsedBulkKeys.length} ` : ""}Keys`
              : "Save"}
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

AddApiKeyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  provider: PropTypes.string,
  providerName: PropTypes.string,
  isCompatible: PropTypes.bool,
  isAnthropic: PropTypes.bool,
  authType: PropTypes.string,
  authHint: PropTypes.string,
  website: PropTypes.string,
  proxyPools: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  })),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
