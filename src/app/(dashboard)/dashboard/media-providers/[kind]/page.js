"use client";

import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { MEDIA_PROVIDER_KINDS, AI_PROVIDERS, getProvidersByKind, getAllProvidersByKindSync } from "@/shared/constants/providers";
import AddCustomProviderModal from "../AddCustomProviderModal";

function getEffectiveStatus(conn) {
  const isCooldown = Object.entries(conn).some(
    ([k, v]) => k.startsWith("modelLock_") && v && new Date(v).getTime() > Date.now()
  );
  return conn.testStatus === "unavailable" && !isCooldown ? "active" : conn.testStatus;
}

function MediaProviderCard({ provider, kind, connections }) {
  const providerInfo = AI_PROVIDERS[provider.id];
  const isNoAuth = !!providerInfo?.noAuth;
  const isCustom = !!provider.isCustom;

  const providerConns = connections.filter((c) => c.provider === provider.id);
  const connected = providerConns.filter((c) => { const s = getEffectiveStatus(c); return s === "active" || s === "success"; }).length;
  const error = providerConns.filter((c) => { const s = getEffectiveStatus(c); return s === "error" || s === "expired" || s === "unavailable"; }).length;
  const total = providerConns.length;
  const allDisabled = total > 0 && providerConns.every((c) => c.isActive === false);

  const renderStatus = () => {
    if (isNoAuth) return <Badge variant="success" size="sm">Ready</Badge>;
    if (allDisabled) return <Badge variant="default" size="sm">Disabled</Badge>;
    if (total === 0) return <span className="text-xs text-text-muted">No connections</span>;
    return (
      <>
        {connected > 0 && <Badge variant="success" size="sm" dot>{connected} Connected</Badge>}
        {error > 0 && <Badge variant="error" size="sm" dot>{error} Error</Badge>}
        {connected === 0 && error === 0 && <Badge variant="default" size="sm">{total} Added</Badge>}
      </>
    );
  };

  return (
    <Link href={`/dashboard/media-providers/${kind}/${provider.id}`} className="group">
      <Card
        padding="xs"
        className={`h-full hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors cursor-pointer ${allDisabled ? "opacity-50" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div
            className="size-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${provider.color?.length > 7 ? provider.color : (provider.color ?? "#888") + "15"}` }}
          >
            <ProviderIcon
              src={provider.isCustom ? undefined : `/providers/${provider.id}.png`}
              alt={provider.name}
              size={30}
              className="object-contain rounded-lg max-w-[30px] max-h-[30px]"
              fallbackText={provider.textIcon || provider.id.slice(0, 2).toUpperCase()}
              fallbackColor={provider.color}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
              {isCustom && <Badge variant="primary" size="sm">Custom</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {renderStatus()}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function MediaProviderKindPage() {
  const { kind } = useParams();
  const [connections, setConnections] = useState([]);
  const [providerNodes, setProviderNodes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kind);

  // Combine hardcoded providers with custom nodes
  const providers = getAllProvidersByKindSync(kind, providerNodes);

  useEffect(() => {
    // Fetch connections
    fetch("/api/providers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []))
      .catch(() => {});

    // Fetch provider nodes
    fetch("/api/provider-nodes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProviderNodes(d.nodes || []))
      .catch(() => {});
  }, []);

  const handleCreated = (node) => {
    setProviderNodes((prev) => [...prev, node]);
    setShowAddModal(false);
  };

  // Early return after all hooks
  if (!kindConfig) return notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{kindConfig.label} Providers</h2>
        <Button
          size="sm"
          icon="add"
          onClick={() => setShowAddModal(true)}
        >
          Add Custom Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl text-text-muted text-sm">
          No providers support <strong>{kindConfig.label}</strong> yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {providers.map((provider) => (
            <MediaProviderCard
              key={provider.id}
              provider={provider}
              kind={kind}
              connections={connections}
            />
          ))}
        </div>
      )}

      <AddCustomProviderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleCreated}
        defaultKind={kind}
      />
    </div>
  );
}
