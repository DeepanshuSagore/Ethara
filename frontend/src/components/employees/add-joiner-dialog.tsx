"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { errorMessage } from "@/lib/api/client";
import { useAddJoiner, useProjects } from "@/lib/api/hooks";
import { DEPARTMENTS } from "@/lib/constants";

/**
 * Time-derived code (ETH-<seconds mod 10^6>) — the seeded range stops at
 * ETH-5000, so collisions are practically impossible; the API's 409 (rule 6)
 * still backstops duplicates.
 */
function generateEmployeeCode() {
  return `ETH-${String(Math.floor(Date.now() / 1000) % 1_000_000).padStart(6, "0")}`;
}

type FieldName = "name" | "email" | "department" | "role" | "projectId";
type FormErrors = Partial<Record<FieldName, string>>;

/** Visible label with the shared required-asterisk marker. */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}{" "}
      <span aria-hidden="true" className="text-destructive-strong">
        *
      </span>
    </label>
  );
}

/** Inline validation message, linked to its field via aria-describedby. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive-strong">
      {message}
    </p>
  );
}

/** Admin/HR dialog: add a new joiner to the pending-allocation queue. */
export function AddJoinerDialog({ children }: { children: React.ReactNode }) {
  const projectsQuery = useProjects();
  const addJoiner = useAddJoiner();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [role, setRole] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const departmentRef = React.useRef<HTMLButtonElement>(null);
  const roleRef = React.useRef<HTMLInputElement>(null);
  const projectRef = React.useRef<HTMLButtonElement>(null);

  const clearError = (field: FieldName) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const reset = () => {
    setName("");
    setEmail("");
    setDepartment("");
    setRole("");
    setProjectId("");
    setErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    // Never dismissable while the request is in flight.
    if (!next && addJoiner.isPending) return;
    if (!next) setErrors({});
    setOpen(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Enter the joiner's full name.";
    if (!email.trim()) nextErrors.email = "Enter their work email.";
    if (!department) nextErrors.department = "Select a department.";
    if (!role.trim()) nextErrors.role = "Enter their role title.";
    if (!projectId) nextErrors.projectId = "Select a project.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Inline errors replace the old transient toast; land focus on the
      // first invalid field so the fix is one keystroke away.
      const focusOrder: Array<[FieldName, React.RefObject<HTMLElement | null>]> = [
        ["name", nameRef],
        ["email", emailRef],
        ["department", departmentRef],
        ["role", roleRef],
        ["projectId", projectRef],
      ];
      focusOrder.find(([field]) => nextErrors[field])?.[1].current?.focus();
      return;
    }

    const joinerName = name.trim();
    addJoiner.mutate(
      {
        employee_code: generateEmployeeCode(),
        name: joinerName,
        email: email.trim().toLowerCase(),
        department,
        role: role.trim(),
        joining_date: new Date().toISOString(),
        project_id: Number(projectId),
      },
      {
        onSuccess: () => {
          toast({
            title: "New joiner added",
            description: `${joinerName} joined the pending-allocation queue.`,
          });
          reset();
          setOpen(false);
        },
        onError: (error) =>
          // Surfaces the API's 409 detail verbatim (duplicate email — rule 6).
          toast({
            title: "Could not add employee",
            description: errorMessage(error),
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onInteractOutside={(e) => {
          if (addJoiner.isPending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (addJoiner.isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add new joiner</DialogTitle>
          <DialogDescription>
            The employee is queued for allocation with suggested seats near their project team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="joiner-name">Full name</FieldLabel>
              <Input
                id="joiner-name"
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                placeholder="Asha Verma"
                aria-required="true"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "joiner-name-error" : undefined}
              />
              <FieldError id="joiner-name-error" message={errors.name} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="joiner-email">Email</FieldLabel>
              <Input
                id="joiner-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                placeholder="asha.verma@ethara.ai"
                aria-required="true"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "joiner-email-error" : undefined}
              />
              <FieldError id="joiner-email-error" message={errors.email} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="joiner-department">Department</FieldLabel>
              <Select
                value={department}
                onValueChange={(value) => {
                  setDepartment(value);
                  clearError("department");
                }}
              >
                <SelectTrigger
                  id="joiner-department"
                  ref={departmentRef}
                  className="aria-invalid:border-destructive"
                  aria-required="true"
                  aria-invalid={errors.department ? true : undefined}
                  aria-describedby={errors.department ? "joiner-department-error" : undefined}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="joiner-department-error" message={errors.department} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="joiner-role">Role</FieldLabel>
              <Input
                id="joiner-role"
                ref={roleRef}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  clearError("role");
                }}
                placeholder="Software Engineer"
                aria-required="true"
                aria-invalid={errors.role ? true : undefined}
                aria-describedby={errors.role ? "joiner-role-error" : undefined}
              />
              <FieldError id="joiner-role-error" message={errors.role} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <FieldLabel htmlFor="joiner-project">Project</FieldLabel>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  clearError("projectId");
                }}
              >
                <SelectTrigger
                  id="joiner-project"
                  ref={projectRef}
                  className="aria-invalid:border-destructive"
                  aria-required="true"
                  aria-invalid={errors.projectId ? true : undefined}
                  aria-describedby={errors.projectId ? "joiner-project-error" : undefined}
                >
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {/* The popover is never blank: loading, error and empty all
                      get an explanatory (disabled) row. */}
                  {projectsQuery.isPending ? (
                    <SelectItem value="__loading" disabled>
                      Loading projects…
                    </SelectItem>
                  ) : projectsQuery.isError ? (
                    <SelectItem value="__error" disabled>
                      Could not load projects
                    </SelectItem>
                  ) : (projectsQuery.data ?? []).length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No projects found
                    </SelectItem>
                  ) : (
                    (projectsQuery.data ?? []).map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FieldError id="joiner-project-error" message={errors.projectId} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={addJoiner.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addJoiner.isPending}>
              {addJoiner.isPending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> Adding…
                </>
              ) : (
                "Add to queue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
