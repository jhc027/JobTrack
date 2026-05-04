from app import models


def build_profile_text(profile: models.CandidateProfile) -> str:
    sections = [
        ("Name", profile.name),
        ("Education", profile.education),
        ("Skills & Technologies", profile.skills),
        ("Projects", profile.projects),
        ("Certifications", profile.certifications),
        ("Work Experience", profile.work_experience),
        ("Professional Summary & Core Pitch", profile.experience_summary),
        ("Tone & Writing Strategy", profile.preferred_tone),
    ]
    return "\n\n".join(f"{label}:\n{value}" for label, value in sections if value)
