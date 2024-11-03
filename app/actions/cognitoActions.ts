import { redirect } from "next/navigation";
import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  resendSignUpCode,
  autoSignIn,
} from "aws-amplify/auth";
import { getErrorMessage } from "../utils/get-error-message";
import { checkTableExists } from "../utils/db";
import { createUser } from "./user";

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  repeatPassword: string;
  code: number | string;
  agreeTerms: boolean;
}

interface sendOTPAgainData {
  email: string;
}

interface SignupConformationFormData {
  email: string;
  code: number | string;
}

interface LoginFormData {
  email: string;
  password: string;
}

// Function to Initiate Signup process
export async function handleSignUp(formData: SignupFormData) {
  try {
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: String(formData.email),
      password: String(formData.password),
      options: {
        userAttributes: {
          email: String(formData.email),
          name: String(formData.name),
        },
        // optional
        autoSignIn: true,
      },
    });

    console.log("user_id: ", userId);
    // Creating user entry into the database
    await checkTableExists('User');

    const entryResult = await createUser({
      id: userId,
      email: formData.email,
      name: formData.name
    });

    if(entryResult.success){
      console.log("user entered into database");
    }

    return JSON.stringify({ success: true, message: "OTP sent to email" })
  } catch (error) {
    console.log(error)
    return JSON.stringify({ success: false, error: getErrorMessage(error) })
  }
}

// Function to resend the email verification code
export async function handleSendEmailVerificationCode(
  formData: sendOTPAgainData
) {
  try {
    await resendSignUpCode({
      username: String(formData.email),
    });
    return JSON.stringify({ success: true, message: "Code sent successfully" })
  } catch (error) {
    return JSON.stringify({ success: true, error: getErrorMessage(error) })
  }
}

// Function to confirm the Signup
export async function handleConfirmSignUp(
  formData: SignupConformationFormData
) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username: String(formData.email),
      confirmationCode: String(formData.code),
    });
    
    try {
      await autoSignIn();
    } catch (err) {
      return JSON.stringify({ success: true, message: "User registered successfully", redirectedFrom: 'login' })
    }

    return JSON.stringify({ success: true, message: "User registered successfully", redirectedFrom: 'signup' })
  } catch (error) {
    console.log(error);
    return JSON.stringify({ success: false, error: getErrorMessage(error) })
  }
}

// Function to Login user
export async function handleSignIn(
  formData: LoginFormData
) {
  try {
    const { isSignedIn, nextStep } = await signIn({
      username: String(formData.email),
      password: String(formData.password),
    });
    
    if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
      await resendSignUpCode({
        username: String(formData.email),
      });
      return JSON.stringify({ success: false, error: "User is not verified" })
    }

    return JSON.stringify({ success: true, message: "User logged in successfully" })
  } catch (error) {
    console.log(error);
    return JSON.stringify({ success: true, error: getErrorMessage(error) })
  }

}

// Function to Logout user
export async function handleSignOut() {
  try {
    await signOut();
  } catch (error) {
    console.log(getErrorMessage(error));
  }
  redirect("/auth/login");
}