import { Request, Response, NextFunction } from 'express';
import { usersRepository } from './users.repository';
import { ok } from '../../utils/responses';
import { parsePagination, meta } from '../../utils/pagination';
import { hashPassword } from '../../utils/crypto';
import { emitUserPermissionChange } from '../../sockets';

export async function me(req: Request, res: Response) {
  res.json(
    ok({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role,
        status: req.user!.status,
        permissions: req.user!.permissions || [],
      },
    })
  );
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data: any = {};
    if (req.body.email) data.EMAIL = req.body.email;
    if (req.body.name) data.NAME = req.body.name;
    if (req.body.avatar) data.AVATAR_URL = req.body.avatar;
    if (req.body.password) data.PASSWORD_HASH = await hashPassword(req.body.password);

    const user = await usersRepository.update(req.user!.id, data);
    res.json(ok(user));
  } catch (e) {
    next(e);
  }
}

export async function refreshPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    // Get fresh permissions and role from database
    const permissions = await usersRepository.getPermissions(userId);
    const userRoles = await usersRepository.listRoles(userId);
    const primaryRole = userRoles.length > 0 ? userRoles[0].CODE : 'attendee';

    console.log(`Refreshed permissions for user ${userId}:`, {
      role: primaryRole,
      permissions: permissions,
    });

    res.json(
      ok({
        user: {
          id: userId,
          email: req.user!.email,
          name: req.user!.name,
          role: primaryRole,
          status: req.user!.status,
          permissions: permissions,
        },
      })
    );
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await usersRepository.list(page, limit);
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) {
    next(e);
  }
}

export async function listAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await usersRepository.listAllUsers(page, limit);
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersRepository.findById(Number(req.params.id));
    if (!user) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json(ok(user));
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const passwordHash = req.body.password ? await hashPassword(req.body.password) : null;

    // Prepare user data, only include fields that have values
    const userData: any = {
      EMAIL: req.body.email,
      NAME: req.body.name,
      PASSWORD_HASH: passwordHash,
    };

    // Only add optional fields if they have values
    if (req.body.firebase_uid) {
      userData.FIREBASE_UID = req.body.firebase_uid;
    }
    if (req.body.avatar) {
      userData.AVATAR_URL = req.body.avatar;
    }

    console.log('Creating user with data:', userData);

    const user = await usersRepository.create(userData);

    // If role is provided, assign it to the user
    if (req.body.role) {
      try {
        // Find role by code
        const role = await usersRepository.findRoleByCode(req.body.role);
        if (role) {
          await usersRepository.assignRole(user.ID, role.ID);
          console.log(`Assigned role ${req.body.role} to user ${user.ID}`);
        } else {
          console.warn(`Role ${req.body.role} not found`);
        }
      } catch (roleError) {
        console.warn('Could not assign role to user:', roleError);
        // Continue anyway, user is created successfully
      }
    }

    res.status(201).json(ok(user));
  } catch (e) {
    console.error('Error creating user:', e);
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data: any = { EMAIL: req.body.email, NAME: req.body.name, STATUS: req.body.status };
    if (req.body.password) data.PASSWORD_HASH = await hashPassword(req.body.password);

    console.log('Updating user with data:', data);

    const user = await usersRepository.update(Number(req.params.id), data);

    // If role is provided, update the user's role
    if (req.body.role) {
      try {
        // First, remove all existing roles for this user
        await usersRepository.removeAllRoles(Number(req.params.id));

        // Then assign the new role
        const role = await usersRepository.findRoleByCode(req.body.role);
        if (role) {
          await usersRepository.assignRole(Number(req.params.id), role.ID);
          console.log(`Updated user ${req.params.id} role to ${req.body.role}`);

          // Get updated permissions for the new role
          const newPermissions = await usersRepository.getPermissions(Number(req.params.id));
          console.log(
            `User ${req.params.id} now has ${newPermissions.length} permissions:`,
            newPermissions
          );

          // Emit WebSocket event to notify the user about role change
          emitUserPermissionChange(Number(req.params.id), {
            type: 'role_changed',
            oldRole: 'unknown', // We don't have old role info here
            newRole: req.body.role,
            permissions: newPermissions,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.warn(`Role ${req.body.role} not found`);
        }
      } catch (roleError) {
        console.warn('Could not update user role:', roleError);
        // Continue anyway, user basic info is updated
      }
    }

    // Get the updated user with role information
    const updatedUser = await usersRepository.findById(Number(req.params.id));
    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    // Get user roles to include in response
    const userRoles = await usersRepository.listRoles(Number(req.params.id));
    const primaryRole = userRoles.length > 0 ? userRoles[0].CODE : 'attendee';

    // Create response with updated information
    const responseUser = {
      ...updatedUser,
      ROLE_CODE: primaryRole,
    };

    res.json(ok(responseUser));
  } catch (e) {
    console.error('Error updating user:', e);
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await usersRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    await usersRepository.assignRole(Number(req.params.id), req.body.roleId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function removeRole(req: Request, res: Response, next: NextFunction) {
  try {
    await usersRepository.removeRole(Number(req.params.id), Number(req.params.roleId));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function listRoles(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await usersRepository.listRoles(Number(req.params.id))));
  } catch (e) {
    next(e);
  }
}

export async function getUsersWithMessages(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Getting users with messages...');
    const users = await usersRepository.getUsersWithMessages();
    console.log('Users with messages result:', users.length, 'users found');
    res.json(ok(users));
  } catch (e) {
    console.error('Error in getUsersWithMessages controller:', e);
    next(e);
  }
}

export async function getAvailableUsers(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('getAvailableUsers called with user:', req.user);
    console.log('Request headers:', req.headers);

    // For now, always call without currentUserId to avoid NaN issues
    const users = await usersRepository.getAvailableUsers();
    console.log('Retrieved users count:', users.length);

    res.json(ok(users));
  } catch (e) {
    console.error('Error in getAvailableUsers controller:', e);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve available users',
        details: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

// Test endpoint to check database connection
export async function testDatabaseConnection(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Testing database connection...');
    const result = await usersRepository.testConnection();
    res.json(ok({ message: 'Database connection successful', result }));
  } catch (e) {
    console.error('Database connection test failed:', e);
    next(e);
  }
}

// Test endpoint for available users without authentication
export async function testAvailableUsers(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Testing getAvailableUsers without authentication...');
    const users = await usersRepository.getAvailableUsers();
    console.log('Retrieved users count:', users.length);
    res.json(ok(users));
  } catch (e) {
    console.error('Error in testAvailableUsers:', e);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve available users',
        details: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

// Get users by conference category
export async function getUsersByConferenceCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { conferenceId } = req.query;
    const currentUserId = req.user?.id;

    console.log(
      'getUsersByConferenceCategory called with conferenceId:',
      conferenceId,
      'currentUserId:',
      currentUserId
    );

    const users = await usersRepository.getUsersByConferenceCategory(
      conferenceId ? Number(conferenceId) : undefined,
      currentUserId
    );

    console.log('Retrieved users by category count:', users.length);
    res.json(ok(users));
  } catch (e) {
    console.error('Error in getUsersByConferenceCategory:', e);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve users by conference category',
        details: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

// Get conference users with conference details
export async function getConferenceUsersWithDetails(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { conferenceId } = req.query;
    const currentUserId = req.user?.id;

    console.log(
      'getConferenceUsersWithDetails called with conferenceId:',
      conferenceId,
      'currentUserId:',
      currentUserId
    );

    const users = await usersRepository.getConferenceUsersWithDetails(
      conferenceId ? Number(conferenceId) : undefined,
      currentUserId
    );

    console.log('Retrieved conference users with details count:', users.length);
    res.json(ok(users));
  } catch (e) {
    console.error('Error in getConferenceUsersWithDetails:', e);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve conference users with details',
        details: e instanceof Error ? e.message : String(e),
      },
    });
  }
}
