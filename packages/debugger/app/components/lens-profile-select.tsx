import React from "react";

export type Profile = {
  id: string;
  handle?: string;
};

type ProfileSelectorModalProps = {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  show: boolean;
  onClose: () => void;
};

export const ProfileSelectorModal: React.FC<ProfileSelectorModalProps> = ({
  profiles,
  onSelect,
  show,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Select a Profile</h2>
          <button onClick={onClose} className="close-button">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-item"
              onClick={() => onSelect(profile)}
            >
              {profile.handle || "Unnamed Profile"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
