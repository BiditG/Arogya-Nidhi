import "dotenv/config";
import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
// MongoDB removed — Supabase is used instead
// import connectDB from "./config/mongodb.js";
import authRoutes from "./routes/authRoute.js"
import patientRoutes from "./routes/patient.route.js"
import profileRoutes from "./routes/profile.route.js"
import dashboardRoutes from "./routes/dashboard.routes.js"
import aiRoutes from "./routes/aiRoute.js"
import twilioVoiceRoutes from "./routes/twilioVoice.route.js"
import adminRoutes from "./routes/adminRoute.js"
import doctorRoutes from "./routes/doctorRoute.js"
import { attachTwilioConversationRelayServer } from "./services/twilioConversationRelay.service.js";
import publicRoutes from "./routes/public.routes.js"
import studentsRoutes from "./routes/studentsRoute.js"
import appointmentRoutes from "./routes/appointment.route.js"
import consultationSummaryRoute from "./routes/consultationSummary.route.js";
import paymentRoutes from "./routes/payment.route.js";



const app = express();

// MongoDB is not used in this project; Supabase client handles DB connections

<<<<<<< HEAD
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'https://rncks4z6-5173.inc1.devtunnels.ms', 'https://arogya-nidhi-qobi5xkae-nirman12s-projects.vercel.app', 'https://arogya-nidhi-git-main-nirman12s-projects.vercel.app', 'https://arogya-nidhi.vercel.app'], credentials: true }));
// app.use(cors({ origin: ['https://arogya-nidhi.vercel.app'], credentials: true }));
=======
//app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'https://arogya-nidhi-qobi5xkae-nirman12s-projects.vercel.app', 'https://arogya-nidhi-git-main-nirman12s-projects.vercel.app', 'https://arogya-nidhi.vercel.app'], credentials: true }));
app.use(cors({
	origin: [
		'http://localhost:5173',
		'http://localhost:5174',
		'https://arogya-nidhi.vercel.app',
		'https://arogya-nidhi-ten.vercel.app',
	],
	credentials: true,
}));
>>>>>>> 352ee70822e55df39e704018e54b9408d74ec37e
app.use(express.json());
app.use("/api/consultation-summaries", consultationSummaryRoute);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// simple request logger for debugging
app.use((req, res, next) => {
	console.log('[request]', req.method, req.originalUrl);
	next();
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/patient', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/twilio/voice', twilioVoiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api', publicRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
attachTwilioConversationRelayServer(server);

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	try {
		const routes = [];
		if (app._router && Array.isArray(app._router.stack)) {
			app._router.stack.forEach((layer) => {
				if (layer.route) {
					const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
					routes.push(`${methods} ${layer.route.path}`);
				} else if (layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
					layer.handle.stack.forEach((l) => {
						if (l.route) {
							const methods = Object.keys(l.route.methods).join(',').toUpperCase();
							routes.push(`${methods} ${layer.regexp} -> ${l.route.path}`);
						}
					});
				}
			});
		}
	} catch (err) {
		console.warn('Failed to list routes', err);
	}
});

export default app;
