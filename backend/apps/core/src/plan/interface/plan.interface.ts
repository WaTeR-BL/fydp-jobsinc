export interface GetPlanDocument {
    _id: string;
    name: string;
    type: number;
    price: number;
    cvLimit: number;
    socialIntegration: boolean;
    aiAssistance: boolean;
    aiSummary: boolean;
    googleMeetLink: boolean;
    reminderMessages: number;
    bulkUploadCv: boolean;
    aiNoteTaking: boolean;
    unitCvPrice: number;
    unitReminderPrice: number;
    addonPrice: number;
    whatsappIntegration: boolean;
    freePromptCredit: number;
    status: boolean;
    stripePriceId: string;
    evalBlocksIncluded: number;
    evalBlocksPrice: number;
    interviewerSeats: number;
    activeJobsLimit: number;
    createdAt: Date;
    updatedAt: Date;
}
