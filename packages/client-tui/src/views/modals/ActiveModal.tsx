import { useModals } from "../../contexts/modals.js";
import { DeleteConfirmModal } from "./DeleteConfirmModal.js";
import { DeleteProjectConfirmModal } from "./DeleteProjectConfirmModal.js";
import { EditContentModal } from "./EditContentModal.js";
import { EditProjectModal } from "./EditProjectModal.js";
import { EditProjectSettingsModal } from "./EditProjectSettingsModal.js";
import { EditTagsModal } from "./EditTagsModal.js";
import { FilterModal } from "./FilterModal.js";
import { HelpModal } from "./HelpModal.js";
import { NewProjectModal } from "./NewProjectModal.js";
import { QuickCaptureModal } from "./QuickCaptureModal.js";

// @unit journals.views.modal-layer
// @summary Render the active modal
// @details A thin dispatcher: the modal context decides which modal is open, each modal owns its
// | input, its target, and its save action, and reads the terminal size from the layout context.
export function ActiveModal() {
  const { modal } = useModals();

  if (!modal) return null;

  switch (modal.name) {
    case "capture":
      // @call journals.modals.quick-capture Capture a one-line journal entry
      return <QuickCaptureModal />;

    case "filter":
      // @call journals.modals.filter Search the active view
      return <FilterModal />;

    case "help":
      // @call journals.modals.help Show the keyboard shortcuts
      return <HelpModal />;

    case "new-project":
      // @call journals.modals.new-project Create a project
      return <NewProjectModal />;

    case "edit-content":
      // @call journals.modals.edit-content Edit an entry's content in a textarea
      return <EditContentModal entry={modal.entry} />;

    case "edit-project":
      // @call journals.modals.reassign-entry Move an entry to another project
      return <EditProjectModal entry={modal.entry} />;

    case "edit-tags":
      // @call journals.modals.edit-tags Replace an entry's tags
      return <EditTagsModal entry={modal.entry} />;

    case "delete-entry":
      // @call journals.modals.delete-entry Confirm and soft-delete an entry
      return <DeleteConfirmModal entry={modal.entry} />;

    case "edit-project-settings":
      // @call journals.modals.edit-project-settings Edit a project's name, recurrence, and policy
      return <EditProjectSettingsModal project={modal.project} />;

    case "delete-project":
      // @call journals.modals.delete-project Confirm and soft-delete a project
      return <DeleteProjectConfirmModal project={modal.project} />;

    default:
      return null;
  }
}
