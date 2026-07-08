import {Badge, Button, confirm, DescriptionList} from "attio/client"

const SKILL_TAG_COLORS = [
    "blue",
    "green",
    "purple",
    "orange",
    "pink",
    "cyan",
    "lavender",
    "lime",
] as const

type OpenInLemlistDialogProps = {
    url: string
    fullName: string | null
    company: string | null
    description: string | null
    tagline: string | null
    phone: string | null
    skills: string[]
    hideDialog: () => void
}

export default function OpenInLemlistDialog({
    url,
    fullName,
    company,
    description,
    tagline,
    phone,
    skills,
    hideDialog,
}: OpenInLemlistDialogProps) {
    const handleOpen = async () => {
        const confirmed = await confirm({
            title: "Open in lemlist",
            text: fullName ? `Open ${fullName} in lemlist?` : "Open this contact in lemlist?",
            confirmLabel: "Open on lemlist",
        })

        if (!confirmed) {
            return
        }

        window.open(url, "_blank")
        hideDialog()
    }

    return (
        <>
            <DescriptionList>
                {fullName ? (
                    <DescriptionList.Item label="Name">{fullName}</DescriptionList.Item>
                ) : null}
                {tagline ? (
                    <DescriptionList.Item label="Tagline">{tagline}</DescriptionList.Item>
                ) : null}
                {company ? (
                    <DescriptionList.Item label="Company">{company}</DescriptionList.Item>
                ) : null}
                {description ? (
                    <DescriptionList.Item label="Description">{description}</DescriptionList.Item>
                ) : null}
                {phone ? <DescriptionList.Item label="Phone">{phone}</DescriptionList.Item> : null}
                {skills.length > 0 ? (
                    <DescriptionList.Item label="Skills">
                        {skills.map((skill, index) => (
                            <Badge
                                key={skill}
                                color={SKILL_TAG_COLORS[index % SKILL_TAG_COLORS.length]}
                            >
                                {skill}
                            </Badge>
                        ))}
                    </DescriptionList.Item>
                ) : null}
            </DescriptionList>
            <Button label="Close" onClick={hideDialog} />
            <Button label="Open on lemlist" onClick={handleOpen} />
        </>
    )
}
