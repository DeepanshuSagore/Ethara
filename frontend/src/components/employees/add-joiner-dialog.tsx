"use client";

import * as React from "react";
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

/** Admin/HR dialog: add a new joiner to the pending-allocation queue. */
export function AddJoinerDialog({ children }: { children: React.ReactNode }) {
  const { data: projects } = useProjects();
  const addJoiner = useAddJoiner();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [role, setRole] = React.useState("");
  const [projectId, setProjectId] = React.useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setDepartment("");
    setRole("");
    setProjectId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !department || !role.trim() || !projectId) {
      toast({
        title: "Missing details",
        description: "Fill in every field to add the new joiner.",
        variant: "destructive",
      });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new joiner</DialogTitle>
          <DialogDescription>
            The employee is queued for allocation with suggested seats near their project team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="joiner-name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="joiner-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Asha Verma"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="joiner-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="joiner-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="asha.verma@ethara.ai"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" id="joiner-department-label">
                Department
              </label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger aria-labelledby="joiner-department-label">
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
            </div>
            <div className="space-y-1.5">
              <label htmlFor="joiner-role" className="text-sm font-medium">
                Role
              </label>
              <Input
                id="joiner-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium" id="joiner-project-label">
                Project
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-labelledby="joiner-project-label">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addJoiner.isPending}>
              {addJoiner.isPending ? "Adding…" : "Add to queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
