"use client";

import React, { useState } from "react";
import { useAuth, USER_FIELDS, UserFieldKey } from "@/context/AuthContext";

export default function FieldSelectorModal() {
  const { isFieldModalOpen, closeFieldModal, user, updateField } = useAuth();
  const [selectedKey, setSelectedKey] = useState<UserFieldKey>(user?.roleField || "citizen");

  if (!isFieldModalOpen || !user) return null;

  const handleSave = () => {
    updateField(selectedKey);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={closeFieldModal}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#0d1829",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 20,
          padding: "1.75rem",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#93c5fd", fontWeight: 700, textTransform: "uppercase" }}>
              Profile Customization
            </span>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
              Switch Field / Purpose of Use
            </h2>
          </div>
          <button
            onClick={closeFieldModal}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#94a3b8",
              width: 32,
              height: 32,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1.25rem" }}>
          Select the category that best matches your current transit or operational requirement:
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: "1.5rem",
        }}>
          {(Object.keys(USER_FIELDS) as UserFieldKey[]).map((key) => {
            const item = USER_FIELDS[key];
            const isSelected = selectedKey === key;
            return (
              <div
                key={key}
                onClick={() => setSelectedKey(key)}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  background: isSelected ? item.bgGlow : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${isSelected ? item.color : "rgba(255, 255, 255, 0.08)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f1f5f9" }}>
                      {item.title}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{ color: item.color, fontSize: "0.85rem", fontWeight: 800 }}>✓</span>
                  )}
                </div>

                <div style={{ fontSize: "0.72rem", color: item.color, fontWeight: 700, marginBottom: 4 }}>
                  {item.badge}
                </div>

                <p style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.35, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
          <button
            onClick={closeFieldModal}
            className="btn-outline"
            style={{ fontSize: "0.85rem" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ fontSize: "0.85rem", padding: "0.6rem 1.5rem" }}
          >
            Apply & Switch Field
          </button>
        </div>
      </div>
    </div>
  );
}
