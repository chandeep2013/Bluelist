using bluelist from '../db/schema';

// ---- Requestor Service ----
@path: '/requestor'
service RequestorService {

    entity Requests as projection on bluelist.Requestor {
        *,
        Project : redirected to Projects,
        Table   : redirected to Tables
    } actions {
        @(
            cds.odata.bindingparameter.name: '_it',
            Common.SideEffects             : {TargetProperties: ['_it/Status']}
        )
        action submit() returns Requests;
    };

    @readonly entity Projects  as projection on bluelist.Projects;
    @readonly entity Tables    as projection on bluelist.Tables;
    @readonly entity Roles     as projection on bluelist.Roles;
    @readonly entity Approvers as projection on bluelist.Approver;
}

// ---- Approver Service ----
@path: '/approver'
service ApproverService {

    entity Requests as projection on bluelist.Requestor {
        *,
        Project : redirected to Projects,
        Table   : redirected to Tables
    } actions {
        @(
            cds.odata.bindingparameter.name: '_it',
            Common.SideEffects             : {TargetProperties: ['_it/Status']}
        )
        action approve() returns Requests;
        @(
            cds.odata.bindingparameter.name: '_it',
            Common.SideEffects             : {TargetProperties: ['_it/Status']}
        )
        action rejectRequest()  returns Requests;
        @(
            cds.odata.bindingparameter.name: '_it',
            Common.SideEffects             : {TargetProperties: ['_it/Status']}
        )
        action sendBack() returns Requests;
    };

    @readonly entity Projects as projection on bluelist.Projects;
    @readonly entity Tables   as projection on bluelist.Tables;
    @readonly entity Roles    as projection on bluelist.Roles;
}
