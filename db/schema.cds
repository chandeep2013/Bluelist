namespace bluelist;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity Requestor : managed {
    key RequestID     : UUID;
        RequestNo     : String(20);
        NTID          : String(50);
        FullName      : String(200);
        Project       : Association to Projects;
        Table         : Association to Tables;
        MailID        : String(200);
        ApproverNTID  : String(50);
        Status        : String(20);
        TrainingStatus: String(50);
        AccessFromDate: Date;
        AccessEndDate : Date;
        Comments      : String(1000);
}

entity Approver {
    key NTID    : String(50);
        FullName: String(200);
        Project : Association to Projects;
        Table   : Association to Tables;
        EmailID : String(200);
}

entity Projects {
    key ProjectID  : UUID;
        ProjectName: String(200);
        Tables     : Composition of many Tables on Tables.Project = $self;
}

entity Tables {
    key TableID          : UUID;
        TableName        : String(200);
        TableOwner       : String(200);
        TableOwnerMailID : String(200);
        Project          : Association to Projects;
}

entity Roles {
    key RoleID   : UUID;
        RoleName : String(100);
}
