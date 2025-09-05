import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { userConferenceAssignmentsController } from '../../modules/user-conference-assignments/user-conference-assignments.controller';

export const userConferenceAssignmentsRouter = Router();

// All routes require authentication
userConferenceAssignmentsRouter.use(auth());

// Get all assignments (admin only)
userConferenceAssignmentsRouter.get('/', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.listAssignments.bind(userConferenceAssignmentsController)
);

// Get assignments for a specific user
userConferenceAssignmentsRouter.get('/user/:userId', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.getUserAssignments.bind(userConferenceAssignmentsController)
);

// Get current user's own assignments (no admin permission required)
userConferenceAssignmentsRouter.get('/my-assignments', 
  userConferenceAssignmentsController.getMyAssignments.bind(userConferenceAssignmentsController)
);

// Get assignments for a specific conference
userConferenceAssignmentsRouter.get('/conference/:conferenceId', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.getConferenceAssignments.bind(userConferenceAssignmentsController)
);

// Create new assignment (admin only)
userConferenceAssignmentsRouter.post('/', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.createAssignment.bind(userConferenceAssignmentsController)
);

// Bulk assign conferences to user (admin only)
userConferenceAssignmentsRouter.post('/bulk-assign', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.bulkAssignConferences.bind(userConferenceAssignmentsController)
);

// Update assignment (admin only)
userConferenceAssignmentsRouter.patch('/:id', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.updateAssignment.bind(userConferenceAssignmentsController)
);

// Deactivate assignment (admin only)
userConferenceAssignmentsRouter.patch('/:id/deactivate', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.deactivateAssignment.bind(userConferenceAssignmentsController)
);

// Delete assignment (admin only)
userConferenceAssignmentsRouter.delete('/:id', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.deleteAssignment.bind(userConferenceAssignmentsController)
);

// Check permission for specific conference
userConferenceAssignmentsRouter.get('/check/:userId/:conferenceId/:permission', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.checkPermission.bind(userConferenceAssignmentsController)
);

// Get all permissions for a user
userConferenceAssignmentsRouter.get('/permissions/:userId', 
  rbac('roles.manage'), 
  userConferenceAssignmentsController.getUserPermissions.bind(userConferenceAssignmentsController)
);
