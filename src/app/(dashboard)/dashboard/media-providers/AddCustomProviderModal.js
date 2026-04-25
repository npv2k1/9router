"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Badge, Input, Modal, Select } from "@/shared/components";

const SERVICE_KINDS = [
  { id: "llm", label: "LLM (Chat)" },
  { id: "embedding", label: "Embedding" },
  { id: "tts", label: "Text to Speech" },
  { id: "image", label: "Image Generation" },
  { id: "imageToText", label: "Image to Text" },
  { id: "webSearch", label: "Web Search" },
  { id: "webFetch", label: "Web Fetch" },
];

export default function AddCustomProviderModal({ isOpen, onClose, onCreated, defaultKind = "embedding" }) {
  const [formData, setFormData] = useState({
    name: "",
    prefix: "",
    apiType: "chat",
    baseUrl: "https://api.openai.com/v1",
    serviceKinds: [defaultKind],
    type: "openai-compatible",
  });
  const [submitting, setSubmitting] = useState(false);

  const apiTypeOptions = [
    { value: "chat", label: "Chat Completions" },
    { value: "responses", label: "Responses API" },
  ];

  const handleServiceKindToggle = (kindId) => {
    setFormData((prev) => {
      const newKinds = prev.serviceKinds.includes(kindId)
        ? prev.serviceKinds.filter((k) => k !== kindId)
        : [...prev.serviceKinds, kindId];
      return { ...prev, serviceKinds: newKinds };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/provider-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          prefix: formData.prefix,
          apiType: formData.apiType,
          baseUrl: formData.baseUrl,
          type: formData.type,
          serviceKinds: formData.serviceKinds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.node);
        setFormData({
          name: "",
          prefix: "",
          apiType: "chat",
          baseUrl: "https://api.openai.com/v1",
          serviceKinds: [defaultKind],
          type: "openai-compatible",
        });
      }
    } catch (error) {
      console.log("Error creating provider node:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Add Custom Provider" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My Custom Provider"
          hint="Required. A friendly label for this provider."
        />
        <Input
          label="Prefix"
          value={formData.prefix}
          onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
          placeholder="my-custom"
          hint="Required. Used as the provider prefix for model IDs."
        />
        <Select
          label="API Type"
          options={apiTypeOptions}
          value={formData.apiType}
          onChange={(e) => setFormData({ ...formData, apiType: e.target.value })}
        />
        <Input
          label="Base URL"
          value={formData.baseUrl}
          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
          placeholder="https://api.openai.com/v1"
          hint="The base URL for your OpenAI-compatible API."
        />
        {/* Service Kinds */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Supported Services</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                onClick={() => handleServiceKindToggle(kind.id)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  formData.serviceKinds.includes(kind.id)
                    ? "bg-primary/15 border-primary/40 text-primary font-medium"
                    : "border-border text-text-muted hover:text-primary hover:border-primary/40"
                }`}
              >
                {kind.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1">Select which services this provider supports.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} fullWidth disabled={!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim() || submitting}>
            {submitting ? "Creating..." : "Create Provider"}
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

AddCustomProviderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
  defaultKind: PropTypes.string,
};
