import { InvitationAcceptance } from "@/modules/teaching/components/InvitationAcceptance";
export default async function StudentInvitationPage({ params }: { params: Promise<{ token: string }> }) { return <InvitationAcceptance token={(await params).token}/>; }
