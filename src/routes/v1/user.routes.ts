import { Hono } from "hono"
import { deleteUser, getOtherUser, getUser, updateUserProfile, updateUsername } from "../../controllers/user.controller";
import { authHandler } from "../../middlewares/auth.middleware";
const userRouter = new Hono();

userRouter.patch('/update-profile', updateUserProfile);
userRouter.patch('/update-username', updateUsername);
userRouter.get('/me', getUser);
userRouter.delete('/delete', deleteUser);
userRouter.get('/:username', getOtherUser);

export default userRouter;
