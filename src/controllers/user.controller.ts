import axios from "axios";
import bcrypt from "bcryptjs";
import { Context } from "hono";
import { getPrisma } from "../prisma.setup/client";
import { BadRequestError, InternalServerError } from "../utils/errors";

// @DESC to update user profile
// @route /api/v1/user/update-profile PATCH
// @private

// firstname, lastname, bio, profileImage,
export const updateUserProfile = async (c: Context) => {
	const prisma = getPrisma(c);
	const body = await c.req.json();

	if (!body) {
		throw new BadRequestError("Can't update empty fields");
	}

	const updates: any = {};

	if (body.firstName) updates.firstName = body.firstName;
	if (body.lastName) updates.lastName = body.lastName;
	if (body.bio) updates.bio = body.bio;
	if (body.profileImage) updates.profileImage = body.profileImage;

	const updatedUser = await prisma.user.update({
		where: { id: c.get("userId") },
		data: updates,
	});

	if (!updatedUser) {
		throw new InternalServerError("Something went wrong");
	}

	return c.json({ message: "updated successfully", updatedUser });
};

// @DESC to update username
// @route /api/v1/user/update-username PATCH
// @private

export const updateUsername = async (c: Context) => {
	const prisma = getPrisma(c);

	const { username } = await c.req.json();

	const userId = c.get("userId");

	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user?.needsUsernameUpdate) {
		throw new BadRequestError("You can only update username once!");
	}

	// check if username is unique or not
	const isUsernameNotUnique = await prisma.user.findUnique({
		where: { username },
	});

	if (isUsernameNotUnique) {
		throw new BadRequestError("Username already exist");
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			username,
			needsUsernameUpdate: false,
		},
	});

	return c.json({
		message: "Username updated",
		username,
	});
};

// @DESC Returns logged-in user’s details (read-only).
// @route /api/v1/user/me GET
// @private

export const getUser = async (c: Context) => {
	const prisma = getPrisma(c);
	const userId = c.get("userId");

	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	return c.json(user);
};

// @DESC Allows a logged-in user to permanently delete their account and related data.
// @route /api/v1/user/delete DELETE
// @private

export const deleteUser = async (c: Context) => {
	const prisma = getPrisma(c);
	const userId = c.get("userId");

	try {
		// Step 1: Delete dependent records first (respecting foreign key constraints)
		await prisma.$transaction([
			prisma.bookmark.deleteMany({ where: { userId } }),
			prisma.rating.deleteMany({ where: { userId } }),
			prisma.subscription.deleteMany({ where: { userId } }),
			prisma.apiKey.deleteMany({ where: { userId } }),
			prisma.endpointLog.deleteMany({ where: { userId } }),
			prisma.api.deleteMany({ where: { ownerId: userId } }), // delete user's owned APIs
		]);

		// Step 2: Finally delete the user
		await prisma.user.delete({
			where: { id: userId },
		});

		return c.json({
			success: true,
			message: "User and all associated data deleted successfully.",
		});
	} catch (error) {
		console.error("Error deleting user:", error);
		throw new InternalServerError("Failed to delete user completely");
	}
};

// @DESC Returns a public version (no sensitive data like email).
// @route /api/v1/user/:username GET
// @private

export const getOtherUser = async (c: Context) => {
	const prisma = getPrisma(c);

	const username = c.req.param("username");

	const user = await prisma.user.findUnique({
		where: {
			username,
		},
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			bio: true,
			profileImage: true,
		},
	});

	return c.json({
		user,
	});
};
