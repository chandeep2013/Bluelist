using RequestorService as service from '../../srv/catalog-service';

annotate service.Requests with {
    Project @Common: {
        Text: Project.ProjectName,
        TextArrangement: #TextOnly
    };
    Table @Common: {
        Text: Table.TableName,
        TextArrangement: #TextOnly
    };
};