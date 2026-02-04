import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import Modal from "./Modal";
import Toast from "./Toast";

const ROLES = ["OWNER", "MANAGER", "MECHANIC", "STOREKEEPER", "VIEWER"];

export default function TeamManagement() {
  const { authAxios, activeTenantId, userRole } = useContext(AuthContext);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviteLinkModalOpen, setIsInviteLinkModalOpen] = useState(false);
  const [isInviteDetailsModalOpen, setIsInviteDetailsModalOpen] =
    useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [inviteFilter, setInviteFilter] = useState("pending"); // pending, all, used
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [lastInviteEmail, setLastInviteEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    type: "info",
    visible: false,
  });

  const [inviteForm, setInviteForm] = useState({ email: "", role: "MECHANIC" });

  const [activeTab, setActiveTab] = useState("members");

  const fetchData = async () => {
    try {
      setLoading(true);
      let membersData = [];
      let invitesData = [];

      try {
        const membersRes = await authAxios.get(
          `/tenants/${activeTenantId}/members`,
        );
        membersData = membersRes.data;
      } catch (err) {
        console.error("Members fetch error:", err);
        showToast(
          err.response?.data?.message || "Error fetching team members",
          "error",
        );
      }

      try {
        const params = new URLSearchParams();
        if (inviteFilter === "all") {
          params.set("status", "all");
          params.set("includeExpired", "true");
        } else if (inviteFilter === "used") {
          params.set("status", "used");
        }

        const invitesRes = await authAxios.get(
          `/tenants/${activeTenantId}/invites?${params.toString()}`,
        );
        invitesData = invitesRes.data;
      } catch (err) {
        console.error("[Invites Fetch Error]", {
          status: err.response?.status,
          message: err.response?.data?.message,
          data: err.response?.data,
        });
        showToast(
          err.response?.data?.message || `Fetch Failed: ${err.message}`,
          "error",
        );
      }

      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      showToast("Internal dashboard error", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) fetchData();
  }, [activeTenantId, inviteFilter]);

  const showToast = (message, type = "info") => {
    setToast({ message, type, visible: true });
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await authAxios.post(
        `/tenants/${activeTenantId}/invites`,
        inviteForm,
      );

      // Show the invite link modal so admin can copy/share the link
      if (res.data.invite?.inviteLink) {
        setLastInviteLink(res.data.invite.inviteLink);
        setLastInviteEmail(inviteForm.email);
        setLinkCopied(false);
        setIsInviteLinkModalOpen(true);
      }

      showToast(`Invite sent to ${inviteForm.email}!`, "success");
      setIsInviteModalOpen(false);
      setInviteForm({ email: "", role: "MECHANIC" });
      fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to send invite",
        "error",
      );
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(lastInviteLink);
      setLinkCopied(true);
      showToast("Invite link copied to clipboard!", "success");
    } catch (err) {
      showToast("Failed to copy link", "error");
    }
  };

  const revokeInvite = async (inviteId) => {
    try {
      await authAxios.delete(`/tenants/${activeTenantId}/invites/${inviteId}`);
      showToast("Invite revoked", "success");
      fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to revoke invite",
        "error",
      );
    }
  };

  const resendInvite = async (inviteId, email) => {
    try {
      const res = await authAxios.post(
        `/tenants/${activeTenantId}/invites/${inviteId}/resend`,
      );

      // Show the invite link modal so admin can copy the new link
      if (res.data.inviteLink) {
        setLastInviteLink(res.data.inviteLink);
        setLastInviteEmail(email);
        setLinkCopied(false);
        setIsInviteLinkModalOpen(true);
      }

      showToast(`Invite resent to ${email}!`, "success");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to resend invite",
        "error",
      );
    }
  };

  const viewInviteDetails = async (invite) => {
    setSelectedInvite(invite);
    setIsInviteDetailsModalOpen(true);
  };

  const confirmDeleteInvite = async () => {
    if (!selectedInvite) return;

    try {
      await authAxios.delete(
        `/tenants/${activeTenantId}/invites/${selectedInvite._id || selectedInvite.id}`,
      );
      showToast("Invite deleted permanently", "success");
      setIsInviteDetailsModalOpen(false);
      setSelectedInvite(null);
      fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to delete invite",
        "error",
      );
    }
  };

  const updateMemberStatus = async (membershipId, status) => {
    try {
      await authAxios.patch(
        `/tenants/${activeTenantId}/members/${membershipId}`,
        { status },
      );
      showToast(`User ${status.toLowerCase()}ed`, "success");
      fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update user",
        "error",
      );
    }
  };

  const updateMemberRole = async (membershipId, role) => {
    try {
      await authAxios.patch(
        `/tenants/${activeTenantId}/members/${membershipId}`,
        { role },
      );
      showToast("Role updated", "success");
      fetchData();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update role",
        "error",
      );
    }
  };

  if (userRole !== "OWNER" && userRole !== "MANAGER") {
    return (
      <div className="p-10 text-center text-slate-500 font-bold">
        Access Denied. Only Owners and Managers can manage the team.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Team Management
          </h2>
          <p className="text-slate-500 mt-1">
            Manage staff access and roles for your garage.
          </p>
        </div>
        {activeTab === "invites" && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            New Invitation
          </button>
        )}
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("members")}
            className={`py-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            Active Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("invites")}
            className={`py-4 px-1 border-b-2 font-bold text-sm transition-all ${
              activeTab === "invites"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            Pending Invites ({invites.length})
          </button>
        </nav>
      </div>

      {activeTab === "members" ? (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((m) => (
                  <tr
                    key={m.id || m._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {m.userId?.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {m.userId?.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {userRole === "OWNER" ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateMemberRole(m.id || m._id, e.target.value)
                          }
                          className="bg-slate-100 text-xs font-bold py-1 px-2 rounded-lg outline-none cursor-pointer"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg">
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {userRole === "OWNER" && m.role !== "OWNER" && (
                        <button
                          onClick={() =>
                            updateMemberStatus(
                              m.id || m._id,
                              m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                            )
                          }
                          className={`text-xs font-bold ${m.status === "ACTIVE" ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}`}
                        >
                          {m.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-10 text-center text-slate-400 font-medium"
                    >
                      No team members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          {/* Invite Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setInviteFilter("pending")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                inviteFilter === "pending"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setInviteFilter("used")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                inviteFilter === "used"
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setInviteFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                inviteFilter === "all"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All History
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invites.map((i) => {
                  const getStatusBadge = () => {
                    if (i.status === "USED") {
                      return (
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                          ✓ Accepted
                        </span>
                      );
                    }
                    if (i.isExpired) {
                      return (
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                          Expired
                        </span>
                      );
                    }
                    if (i.isLocked) {
                      return (
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                          🔒 Locked
                        </span>
                      );
                    }
                    return (
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                        Pending
                      </span>
                    );
                  };

                  return (
                    <tr
                      key={i.id || i._id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {i.email}
                          </span>
                          {i.createdBy && (
                            <span className="text-xs text-slate-400">
                              Invited by {i.createdBy.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                          {i.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge()}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(i.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => viewInviteDetails(i)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                          title="View details"
                        >
                          👁 View
                        </button>
                        {i.status !== "USED" && !i.isExpired && (
                          <button
                            onClick={() => resendInvite(i.id || i._id, i.email)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            title="Resend email and get new link"
                          >
                            📧 Resend
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedInvite(i);
                            setIsInviteDetailsModalOpen(true);
                          }}
                          className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                          title="Delete invite"
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {invites.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center space-y-3">
                      <p className="text-slate-400 font-medium">
                        {inviteFilter === "pending" &&
                          "No pending invitations."}
                        {inviteFilter === "used" &&
                          "No accepted invitations yet."}
                        {inviteFilter === "all" && "No invitation history."}
                      </p>
                      {inviteFilter === "pending" && (
                        <button
                          onClick={() => setIsInviteModalOpen(true)}
                          className="text-indigo-600 font-bold hover:underline"
                        >
                          Send your first invite →
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Staff Member"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Work Email
            </label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none"
              placeholder="mechanic@garage.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Permission Level
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, role: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none bg-white font-medium"
            >
              {ROLES.filter((r) => r !== "OWNER").map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              <strong>Note:</strong> In this demo, the invite link will be shown
              as a notification after you confirm. Copy and share it manually.
            </p>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100"
            >
              Confirm & Create
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}

      {/* Invite Link Modal - Shows after creating invite */}
      <Modal
        isOpen={isInviteLinkModalOpen}
        onClose={() => setIsInviteLinkModalOpen(false)}
        title="🎉 Invite Created!"
      >
        <div className="space-y-6">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-sm text-green-800 font-medium">
              An invitation email has been sent to{" "}
              <strong>{lastInviteEmail}</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Invitation Link (for manual sharing)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={lastInviteLink}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-mono text-slate-600 overflow-hidden"
              />
              <button
                type="button"
                onClick={copyInviteLink}
                className={`px-4 py-2.5 rounded-xl font-bold transition-all ${
                  linkCopied
                    ? "bg-green-100 text-green-700"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {linkCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              <strong>Security Note:</strong> This link is valid for 7 days. The
              invitee will need to verify their email via OTP before they can
              join your garage.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsInviteLinkModalOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite Details Modal */}
      <Modal
        isOpen={isInviteDetailsModalOpen}
        onClose={() => {
          setIsInviteDetailsModalOpen(false);
          setSelectedInvite(null);
        }}
        title="Invitation Details"
      >
        {selectedInvite && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className={`rounded-xl p-4 border ${
                selectedInvite.status === "USED"
                  ? "bg-green-50 border-green-100"
                  : selectedInvite.isExpired
                    ? "bg-red-50 border-red-100"
                    : selectedInvite.isLocked
                      ? "bg-amber-50 border-amber-100"
                      : "bg-blue-50 border-blue-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {selectedInvite.status === "USED"
                    ? "✅"
                    : selectedInvite.isExpired
                      ? "⏰"
                      : selectedInvite.isLocked
                        ? "🔒"
                        : "📨"}
                </span>
                <div>
                  <p
                    className={`font-bold ${
                      selectedInvite.status === "USED"
                        ? "text-green-800"
                        : selectedInvite.isExpired
                          ? "text-red-800"
                          : selectedInvite.isLocked
                            ? "text-amber-800"
                            : "text-blue-800"
                    }`}
                  >
                    {selectedInvite.status === "USED" && "Invitation Accepted"}
                    {selectedInvite.status !== "USED" &&
                      selectedInvite.isExpired &&
                      "Invitation Expired"}
                    {selectedInvite.status !== "USED" &&
                      !selectedInvite.isExpired &&
                      selectedInvite.isLocked &&
                      "Temporarily Locked"}
                    {selectedInvite.status !== "USED" &&
                      !selectedInvite.isExpired &&
                      !selectedInvite.isLocked &&
                      "Pending Acceptance"}
                  </p>
                  <p
                    className={`text-sm ${
                      selectedInvite.status === "USED"
                        ? "text-green-600"
                        : selectedInvite.isExpired
                          ? "text-red-600"
                          : selectedInvite.isLocked
                            ? "text-amber-600"
                            : "text-blue-600"
                    }`}
                  >
                    {selectedInvite.status === "USED" &&
                      `Accepted on ${new Date(selectedInvite.usedAt).toLocaleString()}`}
                    {selectedInvite.status !== "USED" &&
                      selectedInvite.isExpired &&
                      `Expired on ${new Date(selectedInvite.expiresAt).toLocaleString()}`}
                    {selectedInvite.status !== "USED" &&
                      !selectedInvite.isExpired &&
                      selectedInvite.isLocked &&
                      `Locked until ${new Date(selectedInvite.lockedUntil).toLocaleString()}`}
                    {selectedInvite.status !== "USED" &&
                      !selectedInvite.isExpired &&
                      !selectedInvite.isLocked &&
                      `Expires ${new Date(selectedInvite.expiresAt).toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Email
                </label>
                <p className="font-medium text-slate-900">
                  {selectedInvite.email}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Role
                </label>
                <p className="font-medium text-slate-900">
                  {selectedInvite.role}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Created
                </label>
                <p className="font-medium text-slate-900">
                  {new Date(selectedInvite.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Invited By
                </label>
                <p className="font-medium text-slate-900">
                  {selectedInvite.createdBy?.name || "Unknown"}
                </p>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                Security Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">OTP Emails Sent:</span>
                  <span className="ml-2 font-medium">
                    {selectedInvite.otpSendCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Failed Attempts:</span>
                  <span className="ml-2 font-medium">
                    {selectedInvite.otpAttempts || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                type="button"
                onClick={confirmDeleteInvite}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
              >
                🗑 Delete Permanently
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInviteDetailsModalOpen(false);
                  setSelectedInvite(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
