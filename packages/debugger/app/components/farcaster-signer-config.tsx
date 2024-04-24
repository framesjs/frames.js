"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import QRCode from "qrcode.react";
import {
  Check,
  ChevronsUpDown,
  VenetianMask,
  LogIn,
  User,
  ShieldEllipsis,
  AlertTriangle,
} from "lucide-react";

import React, { cloneElement, forwardRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { StoredIdentity } from "../hooks/use-farcaster-identity";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FarcasterSignerConfigProps = {
  farcasterUser: StoredIdentity | null;
  loading: boolean;
  startFarcasterSignerProcess: () => Promise<void>;
  impersonateUser: (fid: number) => Promise<void>;
  logout: () => void;
  removeIdentity: () => void;
  storedUsers?: StoredIdentity[];
  onIdentitySelect: (id: number) => void;
};

export default function FarcasterSignerConfig({
  farcasterUser,
  loading,
  startFarcasterSignerProcess,
  impersonateUser,
  logout,
  removeIdentity,
  storedUsers = [],
  onIdentitySelect,
}: FarcasterSignerConfigProps) {
  const [open, setOpen] = useState(false);
  const hasIdentities = storedUsers.length > 0;

  const identitiesPopover = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          type="button"
        >
          {farcasterUser?.status === "pending_approval" &&
            `Pending approval on Warpcast`}
          {farcasterUser?.status === "impersonating" &&
            `Impersonating fid ${farcasterUser.fid}`}
          {farcasterUser?.status === "approved" &&
            `Signed in as ${farcasterUser.fid}`}
          {!farcasterUser && `Select an identity...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No identity found.</CommandEmpty>
            <CommandGroup>
              {storedUsers.map((user, index) => (
                <CommandItem
                  key={`${user._id}-${index}`}
                  onSelect={() => {
                    onIdentitySelect(user._id);
                    setOpen(false);
                  }}
                >
                  <IdentityCommandLabel
                    selected={farcasterUser?._id === user._id}
                    user={user}
                  ></IdentityCommandLabel>
                </CommandItem>
              ))}
              <CommandSeparator />
              <DialogCommandItem
                triggerChildren={
                  <>
                    <VenetianMask className="mr-2 h-4 w-4" /> Impersonate FID
                  </>
                }
              >
                <ImpersonateDialogContent
                  loading={loading}
                  onClose={() => {}}
                  onImpersonate={impersonateUser}
                ></ImpersonateDialogContent>
              </DialogCommandItem>
              <DialogCommandItem
                triggerChildren={
                  <>
                    <LogIn className="mr-2 h-4 w-4" /> Sign in with Farcaster
                  </>
                }
              >
                <SignInWithFarcasterDialogContent
                  loading={loading}
                  onClose={() => {}}
                  onSignIn={startFarcasterSignerProcess}
                ></SignInWithFarcasterDialogContent>
              </DialogCommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <Dialog>
      <div className="space-y-2">
        {!farcasterUser && (
          <Alert>
            <AlertTriangle className="w-4 h-4"></AlertTriangle>
            <AlertTitle>Sign in to use button actions</AlertTitle>
            <AlertDescription>
              In order to use actions you have to impersonate fid or sign in.
            </AlertDescription>
          </Alert>
        )}
        {!farcasterUser && (
          <div className="mt-4 flex flex-col gap-2">
            {hasIdentities ? (
              identitiesPopover
            ) : (
              <>
                <ImpersonateDialogButton
                  loading={loading}
                  onImpersonate={(fid) => impersonateUser(fid)}
                ></ImpersonateDialogButton>
                <FarcasterSignInDialogButton
                  loading={loading}
                  onSignIn={startFarcasterSignerProcess}
                ></FarcasterSignInDialogButton>
              </>
            )}
          </div>
        )}
        {farcasterUser && hasIdentities && (
          <>
            {identitiesPopover}
            {!!farcasterUser && (
              <SelectedIdentity
                user={farcasterUser}
                onLogout={logout}
                onRemove={removeIdentity}
              ></SelectedIdentity>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

function IdentityCommandLabel({
  selected,
  user,
}: {
  selected: boolean;
  user: StoredIdentity;
}) {
  const selectedIcon = <Check className="mr-2 h-4 w-4" />;

  if (user.status === "pending_approval") {
    return (
      <>
        {selected ? selectedIcon : <ShieldEllipsis className="mr-2 w-4 h-4" />}{" "}
        Pending approval on Warpcast
      </>
    );
  }

  if (user.status === "impersonating") {
    return (
      <>
        {selected ? selectedIcon : <VenetianMask className="mr-2 w-4 h-4" />}{" "}
        {`Impersonated fid ${user.fid}`}
      </>
    );
  }

  return (
    <>
      {selected ? selectedIcon : <User className="mr-2 w-4 h-4" />}{" "}
      {`Signed in as fid ${user.fid}`}
    </>
  );
}

type SelectedIdentityProps = {
  user: StoredIdentity;
  onLogout: () => void;
  onRemove: () => void;
};

function SelectedIdentity({ onLogout, onRemove, user }: SelectedIdentityProps) {
  if (user.status === "pending_approval") {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="signer-approval-container mr-4 flex flex-col gap-2">
          Scan with your camera app
          <QRCode value={user.signerApprovalUrl} size={128} />
          <div className="or-divider">OR</div>
          <a
            href={user.signerApprovalUrl}
            target="_blank"
            className="underline"
            rel="noopener noreferrer"
          >
            <Button>open url</Button>
          </a>
          <hr />
          <Button onClick={onLogout} variant={"secondary"}>
            Impersonate instead
          </Button>
        </div>
      </div>
    );
  }

  const actions = (
    <div className="flex gap-2">
      <Button className="w-full" variant="secondary" onClick={onLogout}>
        Logout
      </Button>
      <Button
        className="w-full"
        onClick={() => {
          if (
            window.confirm("Are you sure you want to remove this identity?")
          ) {
            onRemove();
          }
        }}
        variant="destructive"
      >
        Remove
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      {user.status === "impersonating" ? (
        <p>
          <span className="text-slate-400 text-sm">
            Impersonation only works for testing local frames using frames.js to
            validate messages, as they&apos;re mocked.
          </span>
        </p>
      ) : null}
      {actions}
    </div>
  );
}

function ImpersonateDialogButton(
  props: Omit<ImpersonateDialogContentProps, "onClose">
) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Impersonate FID</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <ImpersonateDialogContent
          onClose={() => setIsDialogOpen(false)}
          {...props}
        />
      </DialogPortal>
    </Dialog>
  );
}

function FarcasterSignInDialogButton(
  props: Omit<SignInWithFarcasterDialogContentProps, "onClose">
) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Sign in with Farcaster</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <SignInWithFarcasterDialogContent
          onClose={() => setIsDialogOpen(false)}
          {...props}
        />
      </DialogPortal>
    </Dialog>
  );
}

type DialogCommandItemProps = Omit<
  React.ComponentProps<typeof CommandItem>,
  "children"
> & {
  triggerChildren: React.ReactNode;
  children: React.ReactElement<{ onClose: () => void }>;
};

const DialogCommandItem = forwardRef<HTMLDivElement, DialogCommandItemProps>(
  (props, forwardedRef) => {
    const [isOpen, setIsOpen] = useState(false);
    const { triggerChildren, children, onSelect, ...itemProps } = props;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <CommandItem
            {...itemProps}
            ref={forwardedRef}
            className="DropdownMenuItem"
            onSelect={() => {
              setIsOpen(true);
            }}
          >
            {triggerChildren}
          </CommandItem>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          {cloneElement(children, { onClose: () => setIsOpen(false) })}
        </DialogPortal>
      </Dialog>
    );
  }
);

DialogCommandItem.displayName = "DialogCommandItem";

type ImpersonateDialogContentProps = {
  loading: boolean;
  onImpersonate: (fid: number) => Promise<void>;
  onClose: () => void;
};

const ImpersonateDialogContent = forwardRef<
  HTMLDivElement,
  ImpersonateDialogContentProps
>(({ loading, onImpersonate, onClose }, ref) => {
  return (
    <DialogContent ref={ref}>
      <DialogHeader>
        <DialogTitle>Impersonate FID</DialogTitle>
        <DialogDescription>
          <span className="mb-2 block">
            To impersonate, enter the FID you want to impersonate.
          </span>
          <span>
            Impersonation only works for testing local frames using frames.js to
            validate messages, as they&apos;re mocked.
          </span>
        </DialogDescription>
      </DialogHeader>
      <form
        id="impersonate-fid-form"
        onSubmit={async (e) => {
          e.preventDefault();

          const formData = new FormData(e.currentTarget);
          const fid = formData.get("fid");

          if (fid) {
            await onImpersonate(parseInt(fid.toString(), 10));
          }

          onClose();
        }}
      >
        <Label htmlFor="impersonate-fid-form-input">FID:</Label>
        <Input
          id="impersonate-fid-form-input"
          disabled={loading}
          name="fid"
          required
          placeholder="Enter a valid FID"
          type="number"
          min={1}
        ></Input>
      </form>
      <DialogFooter>
        <Button disabled={loading} form="impersonate-fid-form" type="submit">
          {loading ? "Impersonating..." : "Impersonate"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
});

ImpersonateDialogContent.displayName = "ImpersonateDialogContent";

type SignInWithFarcasterDialogContentProps = {
  loading: boolean;
  onSignIn: () => Promise<void>;
  onClose: () => void;
};

const SignInWithFarcasterDialogContent = forwardRef<
  HTMLDivElement,
  SignInWithFarcasterDialogContentProps
>(({ loading, onSignIn, onClose }, ref) => {
  return (
    <DialogContent ref={ref}>
      <DialogHeader>
        <DialogTitle>Sign in with Farcaster</DialogTitle>
        <DialogDescription>
          <span className="mb-2 block">
            Uses real identity. Works with remote frames and other libraries.
          </span>
          <span className="text-orange-400">
            Be careful this action costs warps.
          </span>
        </DialogDescription>
      </DialogHeader>
      <form
        id="impersonate-fid-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSignIn();
          onClose();
        }}
      ></form>
      <DialogFooter>
        <Button disabled={loading} form="impersonate-fid-form" type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
});

SignInWithFarcasterDialogContent.displayName =
  "SignInWithFarcasterDialogContent";
