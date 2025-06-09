export interface Grant {
  id: string;
  title: string | null;
  description: string | null;
  deadline: string | null;
  sector: string | null;
  stage: string | null;
  fundingAmount?: string | null;
  tags?: string[];
}
